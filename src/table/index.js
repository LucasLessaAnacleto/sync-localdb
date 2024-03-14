const validation = require("../scripts/ValidationHandler.js");
const Fs = require("../scripts/fileSystem.js");
const { setRules, uuid, symbols, registerTable } = require("./configuration.js");

const insertData = function(tableName, rowData){  
    const db = Fs.read;
    const tableIndex = db.findIndex(tb => tb.tableName === tableName);
    if(tableIndex < 0) return false;
    db[tableIndex].rows.push( rowData );
    Fs.create(db);
    return true;
}

const deleteData = function(tableName, row){
    const db = Fs.read;
    const tableIndex = db.findIndex(tb => tb.tableName === tableName);
    if(tableIndex < 0) return false;
    db[tableIndex].rows.splice(row, 1);
    Fs.create(db);
    return true;
}

const updateData = function(tableName, row, rowData){  
    const db = Fs.read;
    const tableIndex = db.findIndex(tb => tb.tableName === tableName);
    if(tableIndex < 0) return false;
    db[tableIndex].rows[row] = rowData;
    Fs.create(db);
    return true;
}

class Table {
    constructor(name, fields, localdb){
        let getRule = setRules(fields);
        this.rules = getRule.rules;
        this.validInputEntity = getRule.validInputEntity;
        this.isOptionalField = getRule.isOptionalField;
        this.isValueDefaultField = getRule.isValueDefaultField;
        this.isUniqueIndexField = getRule.isUniqueIndexField;
        this.name = name;
        this.localdb = localdb;
        if(!this.getTable) Fs.add({tableName: this.name, rows: []});
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
        const table = this.getTable;
        table.push(newData)
        insertData( this.name, newData);
    } //

    // UPDATE

    updateAtRow(entity, row){
        if(!this.existAtRow(row)) return false;
        this.isValidFinalEntity(entity);
        return updateData(this.name, row, entity);
    } //

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
        this.isValidFinalEntity(rowData);
        return updateData(this.name, row, rowData);
    } //

    updateByCustom(entity, condiction){
        if(typeof condiction !== "function") throw new Error("metodo 'updateByCustom' deve receber uma função paramêtro");
        const rowIndex = this.getTable.findIndex(condiction);
        if(rowIndex < 0) return false;
        this.isValidFinalEntity(entity);
        return updateData(this.name, rowIndex, entity);
    } //

    updateFieldsByCustom(fieldUpdates, condiction){
        if(typeof condiction !== "function") throw new Error("metodo 'updateByCustom' deve receber uma função paramêtro");
        const rowIndex = this.getTable.findIndex(condiction);
        if(rowIndex < 0) return false;
        return this.updateFieldsAtRow(fieldUpdates, rowIndex);
    } //

    // DELETE

    deleteAtRow( row ){
        if(typeof row !== "number" || row % 1 !== 0) throw new Error("o método 'deleteAtRow' deve receber a linha em que deseja ser deletada em 'integer'");
        if(!this.existAtRow(row)) return false;
        deleteData(this.name, row);
        return true;
    } //

    deleteByCustom( condiction ){
        const rowIndex = this.getTable.findIndex(condiction);
        if(rowIndex < 0) return false;
        return deleteData(this.name, rowIndex);
    } //

    // SELECT

    searchAll(){
        return this.getTable || null;
    } //

    searchAtRow( row ){
        if(typeof row !== "number") throw new Error("o método 'seatchAtRow' deve receber o número da linha que deseja buscar");
        return this.getTable.at(row)
    } //

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
    } //

    searchFieldsByCustom(fieldSearchs, condiction){
        if(typeof condiction !== "function") throw new Error("metodo 'searchFieldsByCustom' deve receber uma função paramêtro");
        const rowIndex = this.getTable.findIndex(condiction);
        if(rowIndex < 0) return false;
        return this.searchFieldsAtRow(fieldSearchs, rowIndex);
    } //

    findByCustom( condiction ){
        if(typeof condiction !== "function") throw new Error("metodo 'findByCustom' deve receber uma função paramêtro");
        return this.getTable.find(condiction) || null;
    } //

    findAllByCustom( condiction ){
        if(typeof condiction !== "function") throw new Error("metodo findByCustom deve receber uma função paramêtro");
        return this.getTable.filter(condiction);
    } //

    // EXISTS

    existValueInTable(field, value){
        if(typeof field !== "string") throw new Error("o método existValueInTable necessita que o paramêtro 'field' seja uma 'string'");
        return !!this.getTable.find(row => row[field] === value);
    }

    existAtRow( row ){
        if(typeof row !== "number" || row % 1 !== 0) throw new Error("o método 'existAtRow' deve receber a linha em que deseja verificar a existência em 'integer'");
        return !!this.getTable.at(row) || false;
    }

    // OUTERS

    get getTable(){
        return this.localdb.getTable(this.name);
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
        }else{
            throw new Error("Esse tipo de valor padrão não foi reconhecido, utilize uma função personalisada");
        }
        try{
            value = (typeEspectate === "string") ? String(value) : 
            (typeEspectate === "number") ? Number(value) : value;
        }finally{}
        return validation.validType(value, {type: typeEspectate});
    }

    isValidFinalEntity(entity){
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