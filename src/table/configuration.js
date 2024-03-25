const {v4, validate} = require("uuid");  
const validation = require("../scripts/ValidationHandler");
const Fs = require("../scripts/fileSystem.js");

const symbols = {
    math_random: Symbol("Math"),
    auto_incremet: Symbol("Increment"),
    uuid: Symbol("Uuid"),
    date_now: Symbol("Date"),
    hours_now: Symbol("Hour"),
    year_now: Symbol("Year"),
    day_now: Symbol("Day"),
    time_stamp: Symbol("timestamp")
}

const tablesMonitor = [];
let onMonitor = false;

class Configuration{
    static get symbols(){
        return symbols;
    }
    static uuid(){
        const isValidate = uid => validate(uid);
        const generate = () => v4();
        return {
            generate,
            isValidate
        }
    }
    static setRules(fields){
        const inputTypes = {};
        const rules = {
            types: {},
            optional: {},
            valueDefaults: {},
            uniqueIndex: {}
        }
        for(const field of fields){
            rules.types[field.fieldName] = field.fieldType;
            rules.valueDefaults[field.fieldName] = ["symbol", "function"].includes(typeof field.valueDefault) ? field.valueDefault : null;
            rules.optional[field.fieldName] = field.optional === true;
            rules.uniqueIndex[field.fieldName] = field.uniqueIndex === true;
            inputTypes[field.fieldName] = field.optional === true || rules.valueDefaults[field.fieldName] !== null ? ["undefined"].concat(field.fieldType) : field.fieldType;
            if(rules.valueDefaults[field.fieldName] !== null && rules.optional[field.fieldName] === true) throw new Error("Não é possível definir um campo da table,"+
                                                                                                                " como 'optional' e 'valueDefault' ao mesmo tempo");
        }
        const validInputEntity = (entity) => !!validation.validObjectType(entity, inputTypes);
        const isOptionalField = (field) => rules.optional[field] === true;
        const isValueDefaultField = (field) => [null, undefined].includes(rules.valueDefaults[field]) ? false : rules.valueDefaults[field];
        const isUniqueIndexField = (field) => rules.uniqueIndex[field] === true;
        return {
            rules,
            validInputEntity,
            isOptionalField,
            isValueDefaultField,
            isUniqueIndexField
        }
    }
    static registerTable(tableName){
        tablesMonitor.push( tableName );
    }
    static updateRegisterTable(oldTableName, newTableName){
        for(let i = 0; i < tablesMonitor.length; i++){
            if(tablesMonitor[i] === oldTableName){
                tablesMonitor[i] = newTableName;
            }
        }
    }
    static monitorRemoveTables(time){
        if(!onMonitor){
            validation.isMinMax(validation.validType(time, {type: "number", parameterName: "time"}),
            {min: 0.25, max: 10})
            setTimeout( () => {
                const db = Fs.read;
                const newDb = {};
                let change = false;
                for(const tableName in db){
                    if(tablesMonitor.includes(tableName) || tableName === "migrations"){
                        newDb[tableName] = db[tableName];
                    }else{
                        change = true;
                    }
                }
                if(!change) return;
                Fs.create(newDb);
            }, time * (60 * 1000) );
            onMonitor = true;
        }  
    }
    static migrations(){
        const migrationsExecutions = [];    
        const db = Fs.read;
        if(!db.migrations) {
            db.migrations = { listExecuted: [] };
            Fs.create(db);
        }
        function addMigration(db, migration){
            if(!db.migrations.listExecuted?.find(mig => mig === migration)){
                db.migrations.listExecuted.push(migration);
            }
        }
        function existMigration(db, migration){
            return !!db?.migrations?.listExecuted?.find(mig => mig === migration);
        }
        function addMigrationTable(db, migration, tableName, rules, index){
            addMigration(db, migration);
            let migrationTable = tableName;
            if(!!db.migrations[migrationTable]){
                console.log("INDEX EM AÇÃO"); 
                if(typeof index === "number" && index >= 0 && index <= 99){
                    migrationTable += String(index);
                }
                if(!!db.migrations[migrationTable]){
                    throw new Error("Não é possível continuar com o processo de migrations, pois ja existe esse nome indexado no controle das migrations, nesse caso,"+
                    "utilize a propriedade 'index' na criação da tabela passando um número de 0 a 99 ou mude o nome da tabela")
                }
            }
            db.migrations[migrationTable] = {
                tableName: tableName, 
                rules: rules
            };
            Fs.create(db);
            return migrationTable;
        }
        function getFunctionsRules(rules){
            const types = rules.type;
            const inputTypes = {};
            for(const typeName in types){
                inputTypes[typeName] = rules.optional === true || rules.valueDefaults[typeName] !== null ? ["undefined"].concat(types[typeName]) : types[typeName];
            }
            const validInputEntity = (entity) => !!validation.validObjectType(entity, inputTypes);
            const isOptionalField = (field) => rules.optional[field] === true;
            const isValueDefaultField = (field) => [null, undefined].includes(rules.valueDefaults[field]) ? false : rules.valueDefaults[field];
            const isUniqueIndexField = (field) => rules.uniqueIndex[field] === true;
            return {
                validInputEntity,
                isOptionalField,
                isValueDefaultField,
                isUniqueIndexField
            }
        }
        function existTb(db, tableName){
            return typeof db.migrations[tableName] === 'object';
        }
        function findMigrationTable(db, tableName){
            return Object.keys(db.migrations).find( table => {
                if(table === "listExecuted") return false;
                return (db.migrations[table]?.tableName === tableName);
            } );
        }
        return {
            error(migration){
                let input = migration;
                if(typeof migration === "object"){
                    input = migration.migration;
                }
                if(!input || typeof input !== "string") throw new Error("A migration deve ser definida corretamente");
                return input;
            },
            executed(migration){
                const db = Fs.read;
                return !migrationsExecutions.find(mig => mig === migration) && existMigration(db, migration);
            },
            register(migration, tableName, rules, index){
                if(!tableName || typeof tableName !== 'string') throw new Error("O nome da tabela está inválido");
                if(typeof rules !== "object" || rules === null) throw new Error("O parametro 'rules' deve ser passado com a regras da tabela");
                const db = Fs.read;
                const migrationTable = addMigrationTable(db, migration, tableName, rules, index);
                migrationsExecutions.push(migration);
                return migrationTable;
            },
            updateName(migration, tableName, newTableName){
                const db = Fs.read;
                if(!existTb(db, tableName)){
                    const findedMigrationTable = findMigrationTable(db, tableName);
                    if(!findedMigrationTable){
                        throw new Error("Essa tabela não existe nas migrations atual");
                    }
                    tableName = findedMigrationTable;
                } 
                db.migrations[tableName].tableName = newTableName;
                db.migrations.listExecuted.push(migration);
                Fs.create(db);
                migrationsExecutions.push(migration);
            },
            updateRules(tableName, newRules){
                const db = Fs.read;
                if(!existTb(db, tableName)) throw new Error("Essa tabela não existe nas migrations atual");
                db.migrations[tableName].rules = newRules;
                Fs.create(db);
            },
            recovery(tableName){
                const db = Fs.read;
                if(!db.migrations[tableName]) throw new Error("Não é possível recuperar dados das migrations");
                const result = db.migrations[tableName];
                try{
                    return {
                        rules: result.rules,
                        tableName: result.tableName,
                        functions: getFunctionsRules(result.rules)
                    }
                }catch(err){
                    throw new Error("Não é possível recuperar dados das migrations\ndetalhes: "+err.message)
                }
            },
            existTable(tableName){
                const db = Fs.read;
                return existTb(db, tableName);
            }
        }
    }
}

module.exports = Configuration;

