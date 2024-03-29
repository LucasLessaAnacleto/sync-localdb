const validation = require("../scripts/ValidationHandler.js");
const Fs = require("../scripts/fileSystem.js");
const { uuid, symbols, registerTable, updateRegisterTable, registerMigration } = require("./configuration.js");

const insertData = function(tableName, rowData){  
    const db = Fs.read;
    if(!db[tableName] || db[tableName].constructor !== Array ) return false;
    db[tableName].push( rowData );
    Fs.create(db);
    return true;
}

const deleteData = function(tableName, row){
    const db = Fs.read;
    if(!db[tableName] || db[tableName].constructor !== Array ) return false;
    db[tableName].splice(row, 1);
    Fs.create(db);
    return true;
}

const updateData = function(tableName, row, rowData){  
    const db = Fs.read;
    if(!db[tableName]) return false;
    if(!db[tableName][row]) return false;
    db[tableName][row] = rowData;
    Fs.create(db);
    return true;
}

class Table {
    constructor(name, rules, localdb, migrations, migrationTable){
        this.rules = rules.rules;
        this.validInputEntity = rules.validInputEntity;
        this.isOptionalField = rules.isOptionalField;
        this.isValueDefaultField = rules.isValueDefaultField;
        this.isUniqueIndexField = rules.isUniqueIndexField;
        this.name = name;
        this.localdb = localdb;
        this.migration = migrations;
        this.migrationTable = migrationTable;
        if(!this.localdb.existTable(name)) Fs.add({tableName: this.name, data: []})
        registerTable(this.name);
    }

    // INSERT

    save(entity){
        this.validInputEntity(entity);
        const newData = {};
        for(const field in this.rules.types){
            const valueDefault = this.isValueDefaultField(field);
            if(!entity[field] && !!valueDefault){
                try{
                    entity[field] = this.setDefaultValue(valueDefault, field, entity);
                }catch(err){
                    throw new Error("O 'valueDefault' escolhido ao campo '"+field+"' não se adequa ao tipo da coluna definido\ndetalhes: "+err.message);
                }
            }
            if(!!entity[field] && this.isUniqueIndexField(field)){
                entity[field] = this.existValueInTable(field, entity[field]) ? (()=>{throw new Error("O campo '"+field+"' é uma coluna 'uniqueIndex'"+
                ", ou seja, não pode ter valores duplicados")})() : entity[field];
            }   
            newData[field] = (this.isOptionalField(field) || entity[field] !== undefined) ? entity[field] : 
                (()=>{throw new Error("O campo '"+field+"' não pode estar vazio para cadastrar no banco")})();
        }
        insertData( this.name, newData);
    } 

    // UPDATE

    updateAtRow(entity, row){
        if(!this.existAtRow(row)) return false;
        this.validFinalEntity(entity);
        return updateData(this.name, row, entity);
    }

    updateByCustom(entity, condiction){
        if(typeof condiction !== "function") throw new Error("metodo 'updateByCustom' deve receber uma função paramêtro");
        const rowIndex = this.getTable.findIndex(condiction);
        if(rowIndex < 0) return false;
        this.validFinalEntity(entity);
        return updateData(this.name, rowIndex, entity);
    } 

    updateFieldsAtRow(fieldUpdates, row){
        if(typeof fieldUpdates !== 'object') throw new Error("O método 'updateFieldsAtRow' deve receber um objeto contendo o 'field' e o 'value' a qual"+
                                                                                                          " deseja atualizar na linha específica");
        validation.validObjectType(fieldUpdates, {field: "string", value: "any"}, true);
        if(fieldUpdates.constructor !== Array) fieldUpdates = Array(fieldUpdates);
        const rowData = this.searchAtRow(row);
        if(!rowData) return false;
        fieldUpdates.forEach( ({field, value}) => {
            rowData[field] = value;
        });
        this.validFinalEntity(rowData);
        return updateData(this.name, row, rowData);
    } 

    updateFieldsByCustom(fieldUpdates, condiction){
        if(typeof condiction !== "function") throw new Error("metodo 'updateByCustom' deve receber uma função paramêtro");
        const rowIndex = this.getTable.findIndex(condiction);
        if(rowIndex < 0) return false;
        return this.updateFieldsAtRow(fieldUpdates, rowIndex);
    } 

    // DELETE

    deleteAtRow( row ){
        if(typeof row !== "number" || row % 1 !== 0) throw new Error("o método 'deleteAtRow' deve receber a linha em que deseja ser deletada em 'integer'");
        if(!this.existAtRow(row)) return false;
        deleteData(this.name, row);
        return true;
    } 

    deleteByCustom( condiction ){
        const rowIndex = this.getTable.findIndex(condiction);
        if(rowIndex < 0) return false;
        return deleteData(this.name, rowIndex);
    } 

    // SELECT

    searchAll(){
        return this.getTable || null;
    } 

    searchAtRow( row ){
        if(typeof row !== "number") throw new Error("o método 'seatchAtRow' deve receber o número da linha que deseja buscar");
        return this.getTable.at(row)
    } 

    searchFieldsAtRow(fieldSearchs, row){
        const rowData = this.searchAtRow(row);
        if(!rowData) throw new Error("Não existe nenhum resultado para essa busca");
        if(fieldSearchs?.constructor !== Array) fieldSearchs = Array(fieldSearchs); 
        const resultSearch = {};
        fieldSearchs.forEach( field => {
            if(!this.rules.types.hasOwnProperty(field)) return;
            resultSearch[field] = rowData[field]; 
        } )
        const searchPropertys = Object.keys(resultSearch);
        if(searchPropertys.length === 0) {
            return null;
        }if(searchPropertys.length === 1) {
            return resultSearch[searchPropertys[0]];
        }else{
            return resultSearch
        }
    } 

    searchFieldsByCustom(fieldSearchs, condiction){
        if(typeof condiction !== "function") throw new Error("metodo 'searchFieldsByCustom' deve receber uma função paramêtro");
        const rowIndex = this.getTable.findIndex(condiction);
        if(rowIndex < 0) return false;
        return this.searchFieldsAtRow(fieldSearchs, rowIndex);
    } 

    findByCustom( condiction ){
        if(typeof condiction !== "function") throw new Error("metodo 'findByCustom' deve receber uma função paramêtro");
        return this.getTable.find(condiction) || null;
    } 

    findAllByCustom( condiction ){
        if(typeof condiction !== "function") throw new Error("metodo findByCustom deve receber uma função paramêtro");
        return this.getTable.filter(condiction);
    } 

    // EXISTS

    existValueInTable(field, value){
        if(typeof field !== "string") throw new Error("o método existValueInTable necessita que o paramêtro 'field' seja uma 'string'");
        return !!this.getTable.find(row => row[field] === value);
    }

    existAtRow( row ){
        if(typeof row !== "number" || row % 1 !== 0) throw new Error("o método 'existAtRow' deve receber a linha em que deseja verificar a existência em 'integer'");
        return !!this.getTable.at(row) || false;
    }

    // DDL

    renameTable(newTableName, objMigration){
        if(newTableName === this.name) return;
        const migration = this.migration.error(objMigration);
        registerMigration(migration);
        if(this.migration.executed(migration)) return;
        if(typeof newTableName !== "string" || newTableName.length < 1) throw new Error("Esse nome nao é válido para uma tabela");
        const db = Fs.read;
        const newDb = {}
        if( db[newTableName] === undefined){
            for(const table in db){
                if(table !== this.name){
                    newDb[table] = db[table];
                }
            }
            newDb[newTableName] = db[this.name];
            Fs.create(newDb);
        }else{
            throw new Error("Não é possível renomeiar a tabela no momento, já existe uma tabela criada com esse nome!");
        }
        this.migration.updateName(migration, this.migrationTable, newTableName);
        updateRegisterTable(this.name, newTableName);
        this.name = newTableName;
    }

    renameField(currentNameField, newNameField, objMigration){
        if(currentNameField === newNameField) return;
        const migration = this.migration.error(objMigration);
        registerMigration(migration);
        if(this.migration.executed(migration)) return;
        if(typeof currentNameField !== "string" || currentNameField.length < 1 
        || typeof newNameField !== "string" || newNameField.length < 1) 
            throw new Error("O nome do campo atual ou o novo nome do campo estão inválidos, devem ser strings");
        if(this.rules.types[currentNameField] === undefined) throw new Error("Não existe nenhum campo com esse nome");
        const db = Fs.read;
        db[this.name].forEach((rowData, i) => {
            const newRowData = {
                [newNameField]: rowData[currentNameField]
            }
            for(const field in rowData){
                if(field !== currentNameField){
                    newRowData[field] = rowData[field]
                }
            }
            db[this.name][i] = newRowData;
        });
        const rules = {types: {}, optional: {}, valueDefaults: {}, uniqueIndex: {}};
        Object.keys(this.rules?.types)?.forEach( (field) => {
            let nameField = field;
            if(field === currentNameField){
                nameField = newNameField;
            }
            rules.types[nameField] = this.rules.types[field];
            rules.optional[nameField] = this.rules.optional[field];
            rules.valueDefaults[nameField] = this.rules.valueDefaults[field];
            rules.uniqueIndex[nameField] = this.rules.uniqueIndex[field];
        } )
        this.migration.updateRules(migration, this.migrationTable, rules, undefined, db);
        this.rules = rules;
    }

    dropField(nameField, objMigration){
        if(typeof nameField !== "string" || nameField.length < 1) 
            throw new Error("O nome do campo está inválido, deve ser strings");
        const migration = this.migration.error(objMigration);
        registerMigration(migration);
        if(this.migration.executed(migration)) return;
        const db = Fs.read;
        const deleteList = [];
        db[this.name].forEach((rowData, i) => {
            const newRowdata = {};
            for(const field in rowData){
                if(field !== nameField){
                    newRowdata[field] = rowData[field];
                } 
            }
            if(Object.keys(newRowdata).length > 0) {
                db[this.name][i] = newRowdata
            }else{
                deleteList.push( i );
            }
        });
        const tableArray = [];
        db[this.name]?.forEach( (rowData, i) => {
            if( !deleteList.includes(i) ){
                tableArray.push(rowData);
            }
        } );
        db[this.name] = tableArray;
        const rules = {types: {}, optional: {}, valueDefaults: {}, uniqueIndex: {}};
        Object.keys(this.rules?.types)?.forEach( (field) => {
            if(field !== nameField){
                rules.types[field] = this.rules.types[field];
                rules.optional[field] = this.rules.optional[field];
                rules.valueDefaults[field] = this.rules.valueDefaults[field];
                rules.uniqueIndex[field] = this.rules.uniqueIndex[field];
            }
        } )
        this.migration.updateRules(migration, this.migrationTable, rules, undefined, db);  
    }

    // OUTERS

    get getTable(){
        return Fs.read[this.name];
    }

    setDefaultValue(symbol, field, inputEntity){
        let value;
        const typeEspectate = this.rules.types[field];
        if(typeof symbol === "function"){
            value = symbol(inputEntity);
        }else if(symbols.auto_incremet === symbol){
            const lastRow = this.searchAtRow(-1);
            value = (lastRow !== undefined) ? Number(lastRow[field]) + 1 : 0;
        }else if(symbols.uuid === symbol){
            value = uuid().generate();
        }else if(symbols.math_random === symbol){
            value = Math.random();
        }else if(symbols.date_now === symbol){
            const date = new Date();
            value = `${date.getFullYear()}${date.getMonth()+1}${date.getDate()}`;
        }else if(symbols.hours_now === symbol){
            value = new Date().getUTCHours()-3
        }else if(symbols.day_now === symbol){
            value = new Date().getDate()
        }else if(symbols.year_now === symbol){
            value = new Date().getFullYear();
        }else if(symbols.time_stamp === symbol){
            value = Date.now();
        }else{
            throw new Error("Esse tipo de valor padrão não foi reconhecido, utilize uma função personalizada");
        }
        try{
            value = (typeEspectate === "string") ? String(value) : 
            (typeEspectate === "number") ? Number(value) : value;
        }finally{}
        return validation.validType(value, {type: typeEspectate});
    }

    validFinalEntity(entity){
        if(entity === null || entity?.constructor === Array ||  typeof entity !== "object") 
            throw new Error("O paramêtro 'entity' deve ser um objeto contendo todas os campos definidos na criação da 'table'");
        for(const field in this.rules.types){
            try{
                validation.validType(entity[field], {
                    type: this.isOptionalField(field) && !this.isValueDefaultField(field) ? ["undefined"].concat(this.rules.types[field]) : this.rules.types[field], 
                    parameterName: field
                });
            }catch(err){
                throw new Error("O campo '"+field+"' deve ser definido\ndetalhes: "+err.message);   
            }
        }
        return true;
    }
}

module.exports = Table;