# CurseForge-Downloader
A simple CurseForge Minecraft modpack downloader. Made to replace the CurseForge app because Overwolf sucks
- Does **NOT** work with Forge modpacks for whatever reason
- Might break

### Setup
**Make sure you have [NodeJS](https://nodejs.org/en/) Installed**
1. Go to https://console.curseforge.com/?#/api-keys and get an Api Key
2. Rename **example-config.json** to **config.json**
3. Enter the Api Key you got from [here](https://console.curseforge.com/?#/api-keys) into `"APIKey": "HERE"`
4. run `npm run download` to copy the files to the correct place and register the `curseforge://` protocol. WARNING: This will overwrite any other protocol called `curseforge://`. This **WILL** break the install button opening the Curseforge app!
5. Click install on any Minecraft Modpack on [curseforge.com](https://www.curseforge.com/minecraft/modpacks)
