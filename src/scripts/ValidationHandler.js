const arrayType = ["string", "number", "boolean", "array", "object", "function", "undefined", "int", "float", "null", "NaN", "Infinity"];

function primitiveType(typeInput){
    if(typeInput !== "NaN" && typeInput !== "Infinity") type = typeInput.toLowerCase();
    for(const itemType of arrayType){
        if(itemType === type){
            return itemType;
        }
    }
    throw new Error("o tipo \""+typeInput+"\" não é válido!");
}

function equalPrimitiveType(itemType, value){

    if(!arrayType.includes(itemType)) throw new Error("Não existe esse tipo");

    if(itemType === "int"){

        return ( typeof value === "number" && value % 1 === 0 )

    }else if(itemType === "float"){

        return ( typeof value === "number" )

    }else if(itemType === "null"){

        return (value === null);

    }else if(itemType === "undefined"){

        return (value === undefined);

    }else if(itemType === "NaN"){

        return (isNaN(value));

    }else if(itemType === "Infinity"){

        return (!isFinite(value))

    }else{

        return (itemType === value?.constructor.name.toLowerCase());

    }
}


class ValidationHandler{

    static validType( value, { type, noprimitive, parameterName}){

        if(!type && !noprimitive) throw new Error("parametro \"type\" ou \"noprimitive\" é obrigatório");
        
        if(type === undefined) {
            type = Array();
        }else if(type?.constructor.name !== "Array") {
            if(typeof type === "string" && type.toLowerCase() === "any") return value
            type = Array( type );
        }
      
        for(let i = 0; i < type.length; i++){
            if(typeof type[i] !== "string") throw new Error("todos os tipos passados no parametro \"type\" devem ser strings");
            type[i] = primitiveType(type[i]);
        };

        if((type?.length === 0 || noprimitive !== undefined) && typeof noprimitive !== "string" ) throw new Error("os valores de array \"type\" e do parametro \"noprimitive\" devem ser strings");

        let typePossibles = type.length;
        let noprimitivePossible = (noprimitive !== undefined) ? 1 : 0;

        if( (typePossibles + noprimitivePossible) < 0 || (typePossibles + noprimitivePossible) > 3) 
            throw new Error("deve passar no mínimo 1 tipo e no máximo 3 tipos possíveis para um parametro, campo ou variavel");

        for(const itemType of type){

            if(equalPrimitiveType(itemType, value)){
                return value;
            }

        }

        if(noprimitivePossible !== 0){
            if(noprimitive.toLowerCase() === value.constructor?.name.toLowerCase()){
                return value;
            }
        }
        
        const parameterNameTxt = (!!parameterName) ? "\""+parameterName+"\"" : "ou variavel";
        const noprimitiveTxt = (!!noprimitive && !!type) ? noprimitive+", " : noprimitive;
        const typeTxt = [];
        for(let i = 1; i <= typePossibles; i++){
            if(i === 1){
                typeTxt.push( type[i-1] );
            }else{
                typeTxt.push( " "+type[i-1] );
            }     
        }
        throw new Error(`o campo ou parametro ${parameterNameTxt} deve ser do tipo \"${noprimitiveTxt || ""}${typeTxt || ""}\"\nValor atual: >> ${value} <<\n`);


    }

    static validObjectType( value, propertys, isArray ){
        if(typeof value !== 'object' && value?.constructor.name !== 'Array') 
            throw new Error("parameter \"value\" é obrigatório e deve ser do tipo \"object\" ou um \"array\" de \"object\"");
        if(typeof propertys !== 'object') throw new Error("parameter \"propertys\" é obrigatório e deve ser do tipo \"object\"");

        if(value?.constructor.name === 'Array') {
            if(isArray === true){
                value.forEach((v,i) => {
                    ValidationHandler.validObjectType(v, propertys, false);
                });
            }else{
                throw new Error("se parameter \"isArray\" for \"falso\" o value deve ser do tipo \"object\"");
            }
            return    
        }
        for(let prop in propertys){
            if(typeof propertys[prop] !== "string" && propertys[prop]?.length < 1)
                throw new Error("todas as propriedades do parameter \"propertys\" devem representar o tipo da propriedade em string");
            // if(!value.hasOwnProperty(prop))
            //     throw new Error("Não existe a propriedade \""+prop+"\"\nValor atual: "+JSON.stringify(value,null,2)+"");
            try{
                ValidationHandler.validType(value[prop], {type: propertys[prop], parameterName: prop})
            }catch(err){
                throw new Error("a propriedade \""+prop+"\" está com o tipo inválido\ndetalhes: "+err.message);
            }
        }
        return value;
    }

    static isMinMax( value, {min, max} ){
        const existMin = (typeof min === "number");
        const existMax = (typeof max === "number");
        if( !existMin && !existMax ) throw new Error("Os parametros \"min\" ou \"max\" devem ser definidos corretamente");

        const isLimit = function( n ){
            let condition = true;

            if( existMin ){
                condition = (n >= min);
            }

            if( existMax ){
                condition = condition && (n <= max);
            }
            return condition;
        }
        
        let typeValue;
        try{
            typeValue = value.constructor.name.toLowerCase();
        }catch(err){
            console.log("deu erro ao verificar min e max, "+err);
        }

        if( typeValue === "string" || typeValue === "array" ){

            if ( isLimit( value.length ) ) return value;

        }else if( typeValue === "number" ){

            if ( isLimit( value ) ) return value;

        }else {
            throw new Error("Não foi possível verificar o min e max de "+value+" do tipo "+typeValue);
        }

        let text = (existMin) ? "maior que "+min : "";
        text += (!!text && existMax) ? " e " : "";
        text += (existMax) ? "menor que "+max : "";

        if(typeValue === "number") throw new Error("O número passado deve ser "+text+" para ser válido\nValor: >> "+value+" <<");
        if(typeValue === "array") throw new Error("O número de itens do array passado deve ser "+text+" para ser válido\nValor: >> "+value+" <<");
        if(typeValue === "string")throw new Error("O número de caracteres da string passado deve ser "+text+" para ser válido\nValor: >> "+value+" <<");
    }
}

module.exports = ValidationHandler;