const { execSync } = require('child_process');
const path = require('path');

exports.default = async function(context) {
  if (context.electronPlatformName !== 'darwin') {
    return;
  }

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  
  console.log('Cleaning extended attributes from app bundle...');
  
  try {
    execSync(`xattr -cr "${appPath}"`, { stdio: 'inherit' });
    console.log('✓ Extended attributes cleaned successfully');
  } catch (error) {
    console.warn('Warning: Could not clean extended attributes:', error.message);
  }
};
