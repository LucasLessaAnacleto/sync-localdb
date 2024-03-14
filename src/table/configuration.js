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
    static monitorRemoveTables(time){
        if(!onMonitor){
            validation.isMinMax(validation.validType(time, {type: "number", parameterName: "time"}),
            {min: 0.25, max: 10})
            setTimeout( () => {
                const db = Fs.read;
                db.forEach((table, i) => {
                    if(!tablesMonitor.includes(table.tableName)) db.splice(i,1);
                });
                Fs.create(db);
            }, time * (60 * 1000) );
            onMonitor = true;
        }  
    }
}

module.exports = Configuration;

