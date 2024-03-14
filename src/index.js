const Fs = require("./scripts/fileSystem.js");
const validation = require("./scripts/ValidationHandler.js");
const {symbols, monitorRemoveTables} = require("./table/configuration.js");
const Table = require("./table/index.js");

class Localdb{
    constructor(timeMonitor){
        if(Fs.isVoid()) Fs.create([]);
        monitorRemoveTables(timeMonitor || 3);
    }

    createTable( { tableName, fields } ){
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
        return new Table(tableName, fields, this);
    }

    getTable(tableName){
        return Fs.read.find(table => table.tableName === tableName)?.rows || false;
    }

    static get CONSTANTS_VALUE_DEFAULT(){
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