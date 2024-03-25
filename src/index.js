const Fs = require("./scripts/fileSystem.js");
const validation = require("./scripts/ValidationHandler.js");
const { setRules, symbols, monitorRemoveTables, migrations } = require("./table/configuration.js");
const Table = require("./table/index.js");



class Localdb{
    constructor(timeMonitor){
        if(Fs.isVoid()) Fs.create({});
        monitorRemoveTables(timeMonitor || 3);
        this.migration = migrations();
    }

    createTable( { tableName, fields, migration, index } ){
        this.migration.error(migration);
        if(this.migration.executed(migration)){
            let migrationTable = tableName;
            if(!this.migration.existTable(tableName)) throw new Error("Não existe essa tabela nas migrations!\nnão é possível recuperar os dados");
            if(typeof index === "number" && index >= 0 && index <= 99 && this.migration.existTable(tableName + index)){
                migrationTable += index;
            }
            const recovery = this.migration.recovery(migrationTable);
            const getRules = {
                rules: recovery.rules,
                ...recovery.functions
            }
            return new Table(recovery.tableName, getRules, this, this.migration, migrationTable);
        }
        validation.isMinMax( 
            validation.validType( tableName, 
                {type: "string", parameterName: "tableName"}
            ),{ min: 2 } 
        );
        validation.validType( fields, {type: ["Array", "object"]} );
        if(fields.constructor?.name !== "Array") fields = Array( fields );
        validation.validObjectType( fields, {
            fieldName: "string",
            fieldType: "string",
            optional: ["boolean", "undefined"],
            valueDefault: "any",
            uniqueIndex: ["boolean", "undefined"]
        }, true );
        const getRules = setRules(fields);
        const migrationTable = this.migration.register(migration, tableName, getRules.rules, index);
        return new Table(tableName, getRules, this, this.migration, migrationTable);
    }

    clearMigrations(){
        const db = Fs.read;
        if(db?.migrations){
            db.migrations = {listExecuted: []};
            Fs.create(db);
        }
    }

    getTable(tableName){
        return Fs.read.find(table => table.tableName === tableName)?.rows || false;
    }

    static get value_default(){
        return {
            MATH_RANDOM: symbols.math_random,
            AUTO_INCREMENT: symbols.auto_incremet,
            UUID: symbols.uuid,
            DATE_NOW: symbols.date_now,
            HOURS_NOW: symbols.hours_now,
            YEAR_NOW: symbols.year_now,
            DAY_NOW: symbols.day_now,
            TIME_STAMP: symbols.time_stamp
        }
    }
}

module.exports = Localdb;