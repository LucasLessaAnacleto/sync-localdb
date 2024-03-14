# library sync-localdb

## Para que serve?
sync-localdb é uma biblioteca para desenvolvimento rápido de um software que deseja guardar seus dados sem precisar de conexão e se preocupar com infra-estrutura.
Ele também pode servir bem para o caso de aplicações em que deseja utilizar apenas localmente.

## Como começar a usar?

```shell
npm i sync-localdb
```

```js
// commonjs
const Localdb = require("sync-localdb");
// es6
import Localdb from "sync-localdb";
// instanciando a classe do banco de dados
const localdb = new Localdb();
```

## Primeiros passos:

1. Criar uma table client

```js
const userTable = localdb.createTable("users", {
    fields: [
        {
            fieldName: "userID",
            fieldType: "string",
            uniqueIndex: true,
            valueDefault: Localdb.CONSTANTS_VALUE_DEFAULT.AUTO_INCREMENT
        },
        {
            fieldName: "name",
            fieldType: "string"
        },
        {
            fieldName: "age",
            fieldType: "integer"
        }
    ]
})
```

deve definir no paramêtro do createTable, com 'fields' ou seja os campos, com um array de objetos
contendo no mínimo o nome do campo (fieldName) e o tipo do campo (fieldType), além disso você tbm
pode adicionar a propriedade 'optional', 'valueDefault' e 'uniqueIndex'. Abaixo terá mais detalhado
sobre oq faz cada propriedade dessas:

* **fieldName:**<br>
deve ser uma string contendo o nome daquele campo, basicamente o nome da coluna da tabela.

* **fieldType**<br>
deve ser uma string ou um array de string, contendo o tipo ou os tipos que aquele campo permite.
todos os tipos disponíveis:
"any", "string", "number", "boolean", "array", "object", "function", "undefined", "int", "float", "null", "NaN", "Infinity"

* **optional**<br>
deve ser um booleano, se não definir ele, vem por padrão false, e se definido como true aquele campo
pode ficar vazio.

* **valueDefault**<br>
essa propriedade, se definida, preenche o campo com um valor padrão caso aquele campo esteja vazio na hora de cadastrar.
É possível usar uma forma de valor padrão nativo, utilizando as constantes staticas da classe Localdb:
AUTO_INCREMENT: ele preenche auto incrementando começando do 0.
MATH_RANDOM: ele preenche com um valor aleatório de 0 à 1.
UUID: ele preenche com um uuid.
DATE_NOW: ele preenche com a data atual, ano/mes/dia
HOURS_NOW: ele preenche com a hora atual.
YEAR_NOW: ele preenche com o ano atual.
DAY_NOW: ele preenche com o dia atual.
    Além disso é possível atribuir uma função para gerar um valor padrão personalizado, ganhando como paramêtro da função os proprios
dados daquela entidade.

* **uniqueIndex**<br>
uma propriedade booleana que vem como padrão false, se for true, aquele campo não permitirá duplicação de valores. 
<br>

2. O sync-localdb armazena os dados localmente, e cria as tables em tempo de execução, ou seja, se vc rodar o código uma vez criando a tabela "users",
e depois mudar o nome para "usuarios", ele criara uma outra tabela diferente, ficando uma tabela "users" e outra tabela "usuarios". Para não ficar acumulando
tabelas que nao será mais utilizadas, utilizamos uma função monitora, que depois de um certo tempo de execução (por padrão 3 minutos), ele delete todas as 
tabelas em desuso no código, se quiser mudar esse tempo, é possível declarando o novo tempo no construtor da classe localdb, sendo o mínimo permitido, 0.25 minutos.
<br>  

```js
const localdb = new Localdb(1); // A cada 1 minuto de tempo de execução do código, ele apagara as tabelas em desuso
```
<br>
3. Se quiser alterar o nome de uma tabela, sem perder os dados dela, utilize o método do localdb chamado 'renameTable' passando o nome atual da tabela, e o nome que 
deseja alterar. É importante remover esse código após rodar uma vez. A mesma coisa acontece para um campo de uma tabela, utilizando o método 'remameField' passando 
o nome atual e o novo nome do campo. Além disso é possível, deletar um campo caso deseje utilizando o 'dropField' passando o nome do campo que deseja excluir da tabela.
<br>  

```js
localdb.renameTable("users", "usuarios"); // alterou o nome da tabela 'users' para 'usuarios'
userTable.renameField("id", "userID"); // alterou o campo 'id' da tabela contida na instancia 'userTable', renomeando para 'userID'
userTable.dropFiel("age"); // deletou a coluna 'age' e todos os dados contida nela da tabela contida na instancia 'userTable'
``` 
<br>
4. Agora vc pode utilizar as operações de banco de dados utilizando os métodos disponíveis na instancia da tabela criada pelo o 'localdb.createTable'.
métodos disponíveis:

####    CREATE

* **save**: ele espera um objeto representando a entidade defina por você na criação da tabela, ele salva como uma linha da tabela retornando false ou true
dependendo se salvou com sucesso ou não.

####    READ

* **searchAll**: retorna todas as linhas da tabela em um array com as entidades contendo todos os campos.

* **searchAtRow**: retorna a entidade de acordo com o número da linha passado no parâmetro. Obs: se passar -1 como parâmetro, retornará a ultima linha adicionada.

* **searchFieldsAtRow**: ao inves de retornar toda a entidade, traz apenas os campos requeridos que podem ser passados com uma string com o nome do campo, ou 
    um array com o nome dos campos. Ele retorna apenas os campos contido na linha passada no parâmetro 'row'. Se nao achar, retorna null.

* **searchFieldsByCustom**: assim como 'searchFieldsAtRow' retorna apenas os campos passados, porém ao invés de passar o número da linha, deve passar um callback
    com a condição para filtrar os dados. Se nao achar, retorna null.

* **findByCustom**: encontra a linha da tabela em que a função de filtro customizada, retorne true, a função 'condiction' é como se fosse um callback do método 'filter'
    e 'find' dos arrays. Se nao achar, retorna null.

* **findAllByCustom**: encontra um array contendo todos as linhas em que o callback 'condiction' retorna true. Se nao achar, retorna null.

####     UPDATE

* **updateAtRow**: atualiza a linha da tabela corresponde ao parâmetro 'row', com a entidade que deseja alterar. retorna false ou true
    dependendo se alterou com sucesso ou não.

* **updateFieldsAtRow**: ao inves de substituir uma entidade inteira pela a nota entidade, em um objeto tendo 'field' com o nome do campo e 'value' tendo o novo valor
    que deseja atribuir aquele campo, ou um array de objetos contendo o campo e seu valor que sera alterado. atualiza a linha da tabela corresponde ao parâmetro 'row'.
    retorna false ou true dependendo se alterou com sucesso ou não.

* **updateByCustom**: atualiza a primeira linha da tabela em que a função de filtro customizada, retorne true, é necessário passar a entidade com os campos atualizados. 
    retorna false ou true dependendo se alterou com sucesso ou não.

* **updateFieldsByCustom**: ao invés de atualizar a linha inteira da tabela que foi filtrada através do callback passado no paramêtro 'condiction', ele altera apenas os
    campos passados. retorna false ou true dependendo se alterou com sucesso ou não.

####     DELETE

* **deleteAtRow**: deleta a linha passada pelo o parâmetro 'row' da tabela. retorna false ou true dependendo se deletou com sucesso ou não.

* **deleteByCustom**: deleta a linha da tabela em que a função do filtro customizada seja verdadeira. retorna false ou true dependendo se deletou com sucesso ou não.

####    OUTROS

* **existValueInTable**: retorna true caso exista aquele valor passado no paramêtro 'value' existe no campo passado no paramêtro 'field', se nao retorna false

* **existAtRow**: retorna true caso exista essa linha na tabela.

