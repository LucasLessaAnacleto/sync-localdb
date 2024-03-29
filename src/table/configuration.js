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
const migrationMonitor = [];
let onMonitor = false;
let onMigrations = false;

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
    static registerMigration(migration){
        if(!migrationMonitor.includes(migration)){
            migrationMonitor.push(migration);
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
            setTimeout( async() => {
                const db = Fs.read;
                const newDb = {};
                const newMigration = {listExecuted: []};
                let newListExected = [];
                let change = false;
                const promise1 = new Promise((res) => {
                    for(const tableName in db){
                        if(tablesMonitor.includes(tableName) || tableName === "migrations"){
                            newDb[tableName] = db[tableName];
                            newMigration[tableName] = db.migrations[tableName];
                        }else{
                            change = true;
                        }
                    }
                    res();
                });
                const promise2 = new Promise( (res) => {
                    if(onMigrations){
                        for(const mig of db.migrations.listExecuted){
                            if(migrationMonitor.includes(mig)){
                                newListExected.push(mig)
                            }else{
                                change = true;
                            } 
                        }
                    }else{
                        newListExected = db.migrations.listExecuted;
                    }     
                    res();
                } )
                await Promise.all([ promise1, promise2 ]); 
                if(!change) return;
                newMigration.listExecuted = newListExected;
                newDb.migrations = newMigration;
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
            const types = rules.types;
            const inputTypes = {};
            for(const typeName in types){
                inputTypes[typeName] = rules.optional[typeName] === true || rules.valueDefaults[typeName] !== null ? ["undefined"].concat(types[typeName]) : types[typeName];
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
        function addControlMigration(migration, db){
            if(!migrationsExecutions.find((m) => m === migration)){
                migrationsExecutions.push(migration);
            }
            if(!!db) addMigration(db,migration);
        }
        function getValueDefaultCacheMigration(valueDefaults){
            Object.keys(valueDefaults)?.forEach((field) => {
                if(![undefined, null, false].includes(valueDefaults[field])){
                    if(valueDefaults[field]?.constructor === Symbol){
                        const valueDefaultFinded = Object.keys(symbols).find((s) => symbols[s] === valueDefaults[field]);
                        if(!valueDefaultFinded) throw new Error("Esse 'valueDefault' está inválido!");
                        valueDefaults[field] = valueDefaultFinded;
                    }else if(typeof valueDefaults[field] === "function"){
                        valueDefaults[field] = String(valueDefaults[field]);
                    }else{
                        valueDefaults[field] = false;
                    }
                }else{
                    valueDefaults[field] = false;
                }
            });
            return valueDefaults;
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
                rules.valueDefaults = getValueDefaultCacheMigration(rules.valueDefaults);
                addControlMigration(migration);
                const migrationTable = addMigrationTable(db, migration, tableName, rules, index);
                return migrationTable;
            },
            updateName(migration, migrationTable, newTableName){
                const db = Fs.read;
                if(!db.migrations[migrationTable]) throw new Error("Não é possível renomeiar, pois não entramos o endereço da tabela nas migrations\nSe o problema persistir, use o localdb.clearMigrations() e se mesmo assim não conseguir, tire todos os localdb.createTable() \ne espere o tempo necessario para o monitoramento de tabelas limpar o banco de dados");
                db.migrations[migrationTable].tableName = newTableName;
                addControlMigration(migration, db);
                Fs.create(db);
            },
            updateRules(migration, tableName, newRules, index, dba){
                let db;
                if(!!dba) {db = dba}else{db = Fs.read}
                let migrationTable = tableName;
                if(Object.keys(db.migrations).find(mig => mig === tableName + index)) migrationTable += index;
                if(!db.migrations[migrationTable]) throw new Error("Não é possível atualizar as regras da tabela pois não foi encontrada!");
                newRules.valueDefaults = getValueDefaultCacheMigration(newRules.valueDefaults);
                db.migrations[migrationTable].rules = newRules;
                addControlMigration(migration, db);
                Fs.create(db);
                return migrationTable;
            },
            recovery(tableName, fieldsOriginal){
                const db = Fs.read;
                if(!db.migrations[tableName]) throw new Error("Não é possível recuperar dados das migrations");
                const result = db.migrations[tableName];
                const rules = result.rules;
                Object.keys(rules.valueDefaults).forEach((field) => {
                    if(rules.valueDefaults[field]){
                        if(symbols[rules.valueDefaults[field]] !== undefined){
                            rules.valueDefaults[field] = symbols[rules.valueDefaults[field]];
                        }else{
                            rules.valueDefaults[field] = eval(rules.valueDefaults[field]);
                        }
                    }
                });
                try{
                    return {
                        rules: rules,
                        tableName: result.tableName,
                        functions: getFunctionsRules(rules)
                    }
                }catch(err){
                    throw new Error("Não é possível recuperar dados das migrations\ndetalhes: "+err.message)
                }
            },
            existTable(tableName){
                const db = Fs.read;
                return existTb(db, tableName);
            },
            scheduleMigration(){
                onMigrations = true;
            },
            listMigrations(){
                return Fs.read.migrations.listExecuted;
            }
        }
    }
}

module.exports = Configuration;

