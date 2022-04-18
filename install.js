const path = require("path");
const fs = require("fs")
const ProtocolRegistry = require("protocol-registry");

console.log("Creating Protocol")
ProtocolRegistry.register({
    protocol: "curseforge",
    command: `node ${path.join(process.env.APPDATA, ".lyth-curseforge/app.js")} $_URL_`,
    override: true
}).then(async () => {
    console.log("Successfully registered protocol.");
});
console.log("Moving files to AppData")

let installPath = `${process.env.APPDATA}/.lyth-curseforge`

if (!fs.existsSync(installPath)) {
    fs.mkdir(installPath, (err) => {
        if (err) throw err;
    });
}

fs.copyFileSync('./installFiles/icon.png', `${installPath}/icon.png`)
fs.copyFileSync('./installFiles/app.js', `${installPath}/app.js`)
fs.copyFileSync('./config.json', `${installPath}/config.json`)
fs.copyFileSync('./installFiles/app-package.json', `${installPath}/package.json`)
const { exec } = require("child_process");
console.log("Installing Node Dependencies...")
exec(`cd ${installPath} && npm i`, (error, stdout, stderr) => {
    if (error) {
        console.log(`ERROR: ${error.message}`);
        return;
    }
    if (stderr) {
        console.log(stderr);
        return;
    }
    console.log(stdout);
});
