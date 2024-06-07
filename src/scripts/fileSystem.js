const fs = require("node:fs");

const { myPath } = require("./path.js");

class FileSystem{

    static get read(){
        const json = fs.readFileSync(myPath, { encoding: "utf-8" });
        return !!json ? JSON.parse(json) : undefined;
    }

    static create(json){
        try{
            const jsonStr = JSON.stringify(json, null, 0);
            fs.writeFileSync(myPath, jsonStr, { encoding: "utf-8" } );
        }catch(err){
            console.error("Não foi possível fazer a gravação do arquivo no sistema")
        }
    }

    static get exists(){
        return fs.existsSync(myPath);
    }

    static delete(){
        fs.unlinkSync(myPath);
    }

    static add({tableName, data }){
        try{
            const db = FileSystem.read || {}; 
            db[tableName] = data;
            FileSystem.create(db);
        }catch(err){
            console.error("Não foi possível fazer a gravação do arquivo no sistema")
        }
    }

    static isVoid(){
        if(FileSystem.exists) return typeof FileSystem.read !== "object";
        return true
    }
}

module.exports = FileSystem;