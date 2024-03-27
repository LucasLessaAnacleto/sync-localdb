const Fs = require("./scripts/fileSystem.js");
const validation = require("./scripts/ValidationHandler.js");
const { setRules, symbols, monitorRemoveTables, migrations, registerMigration } = require("./table/configuration.js");
const Table = require("./table/index.js");



class Localdb{
    constructor(timeMonitor){
        if(Fs.isVoid()) Fs.create({});
        monitorRemoveTables(timeMonitor || 3);
        this.migration = migrations();
    }

    createTable( { tableName, fields, migration, index, restart } ){
        this.migration.error(migration);
        registerMigration(migration);
        if(this.migration.executed(migration)){
            let migrationTable = tableName;
            if(!this.migration.existTable(tableName)) throw new Error("Não existe essa tabela nas migrations! não é possível recuperar os dados\nTroque o nome da migration, provavelmente essa já existe com a utilização de outra tabela");
            if(typeof index === "number" && index >= 0 && index <= 99 && this.migration.existTable(tableName + index)){
                migrationTable += index;
            }
            const recovery = this.migration.recovery(migrationTable, fields);
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
        restart = restart === true;
        if(this.existTable(tableName) && !restart ) throw new Error("Essa tabela já existe e não pode ser criada novamente")
        const getRules = setRules(fields);
        let migrationTable;
        if(restart){
            migrationTable = this.migration.updateRules(migration, tableName, getRules.rules, index);
        }else{
            migrationTable = this.migration.register(migration, tableName, getRules.rules, index);
        }
        return new Table(tableName, getRules, this, this.migration, migrationTable);
    }

    clearMigrations(){
        this.migration.scheduleMigration();
    }

    listMigrations(){
        return this.migration.listMigrations;
    }

    getTable(tableName){
        return Fs.read[tableName];
    }

    existTable(tableName){
        return Fs.read[tableName] !== undefined;
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