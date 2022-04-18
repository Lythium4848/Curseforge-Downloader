const axios = require('axios');
const wget = require('node-wget');
const config = require('../config.json')
const extract = require('extract-zip')
const notifier = require('node-notifier');
const fs = require('fs')
const async = require('async')
const curseforgeApiURL = 'https://api.curseforge.com'

let args = process.argv[2].toString()
args = args.replace('curseforge://install/?', '').split("&");
let addonId = args[0].replace('addonId=', '')
let fileId = args[1].replace('fileId=', '')

let downloadPath = `${process.env.APPDATA}/.lyth-curseforge`
console.log("hey!")
function notify(msg) {
    notifier.notify({
        title: 'Curseforge Installer',
        appID: 'Curseforge Installer',
        message: msg,
        icon: `${downloadPath}/icon.png`,
    });
}


if (!fs.existsSync(downloadPath)) {
    fs.mkdir(downloadPath, (err) => {
        if (err) throw err;
    });
}

if (!fs.existsSync(`${downloadPath}/modpacks`)) {
    fs.mkdir(`${downloadPath}/modpacks`, (err) => {
        if (err) throw err;
    });
}

async function curseforgeFetch(endpoint) {
    return await axios.get(`${curseforgeApiURL}/v1/${endpoint}`, {
        headers: {
            'Accept': 'application/json',
            'x-api-key': config["APIKey"]
        }
    })
}

let imageBase64
async function createProfile(minecraftFolder, modDir, modName) {
    let modDirNOverrides = modDir.replace('/overrides', '')
    imageBase64 = "data:image/png;base64," + fs.readFileSync(`${modDirNOverrides}/image.png`, 'base64')

    await fs.readFile(`${minecraftFolder}/launcher_profiles.json`, 'utf8', async (err, data) => {

        if (err) {
            console.error(err)
        } else {
            data = JSON.parse(data);
            data.profiles.MODNAME = {
                "created": "1970-01-01T00:00:00.000Z",
                "gameDir": modDir,
                "icon": imageBase64,
                "lastUsed": "1970-01-01T00:00:00.000Z",
                "lastVersionId": modName,
                "name": modName,
                "type": "custom"
            };
            data = JSON.stringify(data).replace("MODNAME", modName)
            await fs.writeFile(`${minecraftFolder}/launcher_profiles.json`, data, function (err) {
                if (err) {
                    return console.log(err);
                }
            });
        }
    })

    notify(`Finished installing ${modName}`)
}

async function downloadFiles(manifest, modName, modDir) {

    modName = modName.replace(" ", "-")
    const minecraftVersion = manifest.minecraft.version
    let modLoader = manifest.minecraft.modLoaders[0].id
    if (!modLoader.includes(minecraftVersion) & modLoader.includes('fabric')) {
        modLoader = `${modLoader}-${minecraftVersion}`
    }
    const modList = manifest.files

    const modLoaderResponse = await curseforgeFetch(`minecraft/modloader/${modLoader}`)
    const modLoaderData = modLoaderResponse.data.data
    const modLoaderDownloadURL = modLoaderData.downloadUrl

    let modLoaderVersionJSON = modLoaderData.versionJson
    modLoaderVersionJSON = JSON.parse(modLoaderVersionJSON)
    modLoaderVersionJSON.id = modName
    if (!modLoader.includes('.jar') & modLoader.includes('forge')) {
        modLoaderVersionJSON.jar = `${modName}.jar`
    }
    modLoaderVersionJSON = JSON.stringify(modLoaderVersionJSON)


    const minecraftFolder = `${process.env.APPDATA}/.minecraft`
    const minecraftVersionsFolder = `${minecraftFolder}/versions`
    if (!fs.existsSync(`${minecraftVersionsFolder}/${modName}`)) {
        fs.mkdirSync(`${minecraftVersionsFolder}/${modName}`);
    }

    if (!fs.existsSync(`${minecraftVersionsFolder}/${modName}/${modName}.json`)) {
        fs.writeFileSync(`${minecraftVersionsFolder}/${modName}/${modName}.json`, modLoaderVersionJSON)
    }

    await wget({url: modLoaderDownloadURL, dest: `${minecraftVersionsFolder}/${modName}/${modName}.jar`}, async function (error) {
        if (error) {
            console.log(error)
        }
    })

    if (!fs.existsSync(`${modDir}/mods`)) {
        fs.mkdirSync(`${modDir}/mods`)
    }


    await async.forEach(modList, async function(mod) {
        let modId = mod.projectID
        let fileId = mod.fileID
        const modData = await curseforgeFetch(`mods/${modId}/files/${fileId}`)
        const modUrl = modData.data.data.downloadUrl
        const modName = modData.data.data.fileName
        await wget({url: modUrl, dest: `${modDir}/mods/${modName}`}, async function (error) {
            if (error) {
                console.log(error)
            }
        })
    }, async function (err) {
        if (err) throw err;
    })
    await createProfile(minecraftFolder, modDir, modName)

}

async function getManifest(unzipPath, modpackName, modDir) {
    await fs.readFile(`${unzipPath}/manifest.json`, 'utf8', async (err, data) => {

        if (err) {
            console.log(err)
        } else {
            const manifest = JSON.parse(data)
            unzipPath = `${unzipPath}/overrides`
            await downloadFiles(manifest, modpackName, unzipPath)
        }
    })
}

async function getFilesData() {
    const response = await curseforgeFetch(`mods/${addonId}/files`)
    const modPackResponse = await curseforgeFetch(`mods/${addonId}/files/${fileId}`)
    const imageResponse = await curseforgeFetch(`mods/${addonId}`)
    const image = imageResponse.data.data.logo.url

    const filesData = response.data.data[0]
    let fileName = modPackResponse.data.data.fileName
    fileName = fileName.replace(" ", "-")

    if (filesData.gameId !== 432) {
        notify("Unable to download modpack! Please only install Minecraft modpacks.")
        return
    }

    if (!filesData.gameVersions[0].includes('Fabric')) {
        notify("Curseforge Downloader currently dosn't support Forge Modpacks!")
        return
    }
    notify("Starting Modpack Download!")

    const downloadResponse = await curseforgeFetch(`mods/${addonId}/files/${fileId}/download-url`)
    const fileDownloadURL = downloadResponse.data.data
    const unzipPath =  `${downloadPath}/modpacks/${fileName}`.replace('.zip', '').replace(" ", "-")
    const modpackName =  `${fileName}`.replace('.zip', '').replace(" ", "-")
    await wget({url: fileDownloadURL, dest: `${downloadPath}/modpacks/${fileName}`}, async function (error) {
        if (error) {
            console.log(error)
        } else {
            await extract(`${downloadPath}/modpacks/${fileName}`, { dir: unzipPath })
            await getManifest(unzipPath, modpackName)
            await wget({url: image, dest: `${unzipPath}/image.png`}, async function (error) {
                if (error) {
                    console.log(error)
                }
            })
        }
    })

}

getFilesData()
