/**
 * 将 staging 目录打包为 .crx（CRX3 格式）
 * 用法: node scripts/package-crx.cjs <staging-dir>
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const crx3 = require('crx3');

const staging = process.argv[2];
if (!staging || !fs.existsSync(staging)) {
  console.error('用法: node scripts/package-crx.cjs <staging-dir>');
  process.exit(1);
}

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const name = 'bupt-student-evaluation-extension';
const crxOut = path.join(dist, `${name}.crx`);
const keyPath = path.join(dist, 'extension.pem');

fs.mkdirSync(dist, { recursive: true });

function ensureKeyPath() {
  if (process.env.CRX_PRIVATE_KEY) {
    fs.writeFileSync(keyPath, process.env.CRX_PRIVATE_KEY, { mode: 0o600 });
    console.log('使用 CRX_PRIVATE_KEY 签名');
    return keyPath;
  }
  if (fs.existsSync(keyPath)) {
    console.log('使用已有 dist/extension.pem 签名');
    return keyPath;
  }
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type: 'pkcs1', format: 'pem' });
  fs.writeFileSync(keyPath, pem, { mode: 0o600 });
  console.log('已生成新私钥 dist/extension.pem（请备份以保持扩展 ID 不变）');
  return keyPath;
}

crx3([path.resolve(staging)], { crxPath: crxOut, keyPath: ensureKeyPath() })
  .then(() => console.log(`已生成 CRX: ${crxOut}`))
  .catch((err) => {
    console.error('CRX 打包失败:', err);
    process.exit(1);
  });
