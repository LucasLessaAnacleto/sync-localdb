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

## Versões:
* <strong>v1.0</strong> - Modificado dia 14 de março de 2024
* <a href="#2.0"><strong>v2.0</strong> - Modificado dia 28 de março de 2024</a> 

## Primeiros passos:

1. Criar uma table client

```js
const userTable = localdb.createTable({
    tableName: "users",
    fields: [
        {
            fieldName: "userID",
            fieldType: "string",
            uniqueIndex: true,
            valueDefault: Localdb.value_default.AUTO_INCREMENT
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
É possível usar uma forma de valor padrão nativo, utilizando as constantes staticas da classe Localdb:<br>
AUTO_INCREMENT: ele preenche auto incrementando começando do 0.<br>
MATH_RANDOM: ele preenche com um valor aleatório de 0 à 1.<br>
UUID: ele preenche com um uuid.<br>
DATE_NOW: ele preenche com a data atual, ano/mes/dia.<br>
HOURS_NOW: ele preenche com a hora atual.<br>
YEAR_NOW: ele preenche com o ano atual.<br>
DAY_NOW: ele preenche com o dia atual.<br>
TIME_STAMP: ele preenche com o método Date.now().<br>
    Além disso é possível atribuir uma função para gerar um valor padrão personalizado, ganhando como paramêtro da função os proprios
dados daquela entidade.<br>

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
<br><br>  

```js
userTable.renameTable("users", "usuarios"); // alterou o nome da tabela 'users' para 'usuarios'
userTable.renameField("id", "userID"); // alterou o campo 'id' da tabela contida na instancia 'userTable', renomeando para 'userID'
userTable.dropField("age"); // deletou a coluna 'age' e todos os dados contida nela da tabela contida na instancia 'userTable'
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
<br>
<div id="2.0">

## O que mudou na versão v2.0?
<ol>
    <li><a href=#mudance01>Refatoração no codigo</a></li>
    <li><a href=#mudance02>Migrations</a></li>
    <li><a href=#mudance03>Forma de utilizar funções "ddl"</a></li>
    <li><a href=#mudance04>Monitoramento de migrations</a></li>
</ol>
<hr>
<div id="mudance01">
    <h3>Otimização e Refatoração</h3>
    Todo o código de leitura e gravação no banco de dados local, foram refatorados para uma forma mais eficaz e performativa. Porem essa mudança não interfere diretamente na utilização da lib.
</div>
<hr>
<div id="mudance02">
    <h3>Migrations</h3>
    Foi adicionado a feature de “Migrations” que permite que você gerencie as alterações na estrutura do banco de dados ao longo do tempo. Já que o sync-localdb é um banco criado em tempo de execução, antes se você colocasse no código um renameField, na próxima execução do código, se não removesse ele iria tentar renomear de novo e iria cair em um erro de nenhuma tabela encontrada com esse nome. Porém com o controle das migrations a lib consegue entender se aquela operação ja foi executada com sucesso ou não.
</div>

<hr>
<div id="mudance03">
    <h3>Como utilizar as migrations?</h3>
    As migrations são utilizadas nas funções "ddl" como podemos dizer, que são as funções que criam ou alteram estruturas de tabelas. Quais as funções que fazem isso? localdb.createTable, table.renameTable, table.renameField e table.dropField.
<br><hr>

* <strong>Criar tabelas:</strong><br>
A forma de criar tabelas mudou um pouco da versão 1.0, além de passar a nome da tabela e os campos com suas regras, nesse objeto deve conter também a propriedade 'migration' passando uma string com um nome de migration que deseja.

```js
const userTable = localdb.createTable({
    tableName: "users",
    fields: [
        {
            fieldName: "userID",
            fieldType: "string",
            uniqueIndex: true,
            valueDefault: Localdb.value_default.AUTO_INCREMENT
        },
        {
            fieldName: "name",
            fieldType: "string"
        },
        {
            fieldName: "age",
            fieldType: "integer"
        }
    ], // Além de passar essas propriedades, não esqueça de passar a migration
    migration: "create_table",
    // restart: false,
    // index: 0
});
```
Agora ele criará a tabela na primeira execução, e nas próximas execuções ele irá pegar do cache da migration, e não lerá novamente as informações da função 'createTable'.
<h3>Propriedade: restart</h3>
Mas e se caso eu criar a tabela, mas depois querer adicionar um novo campo, ou remover um campo, ou adicionar a regra de 'uniqueIndex' entre outras possíveis mudanças na tabela que poderia ser feito. Se eu mudar apenas o nome da migration como por exemplo para "create_table2", isso faria com que esse código fosse executado, porém, o sync-localdb iria entender que você esta querendo criar uma tabela nova, e cairia no erro "Essa tabela já existe e não pode ser criada novamente", então nesse caso você deve utilizar a propriedade <strong>restart</strong> como true, que a lib iria ler novamente os campos e iria atualizar o cache da tabela.
<h3>Propriedade: index</h3>
Toda a tabela é armazenada no cache depois de sua primeira execução, e são indexadas com os seus nomes originais, o nome da tabela de quando foi executado a primeira vez. Então pode gerar conflitos no caso de alteração no nome da tabela, por exemplo: "renomeei a tabela A para B, e posteriormente criei outra tabela com o nome de A", isso causaria erro, mas você pode fazer isso adicionando a propriedade <strong>index</strong> com um número de 0 a 99.
<h3>Observações</h3>
<ul>
<li> A função 'createTable' não pode ser removido depois de executar, pois você irá precisar da instância da tabela para poder utilizar as operações com o banco local.</li>
<br>
<li>O sync-localdb precisará em toda a execução do nome da tabela com a propriedade 'tableName' e o nome da migration com a propriedade 'migration', então nunca remova-as ou as modifique, só no caso se for sua real intenção de não carregar normalmente a tabela.</li>
<br>
<li> Se um campo utilizar um valor padrão, ou seja, tiver um 'valueDefault' definido, toda vez que carregar a tabela, a lib precisará consultar a propriedade 'fields' no objeto de parametro do 'createTable', pois não é possível armazenar uma função no cache.</li>
</ul>
<hr>

* <strong>Renomear tabelas:</strong><br>
Agora para usar o 'table.renameTable' é necessário também passar um objeto contendo a migration.<br> Exemplo:

```js
userTable.renameTable("user", {migration: "rename_table"});
```
No caso do exemplo acima, alterou o nome da tabela de "users" (o nome atual) para "user". Porém internamente essa tabela ainda é referenciada como "user" no cache da migration, pois se não o usuário iria ter que mudar a propriedade 'tableName' toda vez que usasse um 'renameTable'. <br><br>
O mais interessante do uso da migration nessa função é que você não precisa se preocupar em remover o código para não haver duplicações, eu posso deixar o renameTable em todas as execuções que a lib entenderá que já foi executada e assim não executará novamente, o que na versão 1.0 não era possível.
<hr>

* <strong>Renomear campos:</strong><br>
Para utilizar o 'table.renameField' também é necessário passar um objeto contendo a migration.<br>Exemplo:<br>
```js
userTable.renameField("name", "completeName", {migration: "rename_field"});
```
Neste exemplo ele está alterando o nome do campo "name" para "completeName" da tabela instânciada no 'userTable', que nesse caso é a tabela "user". Assim como no 'renameTable', o sync-localdb identificará se ja foi ou não executada através da migration.<br><br>
Uma observação a se fazer, é que se você utilizar o renameField e depois for dar um 'restart' na tabela, você deve deixar os campos da propriedade 'fields' correto com o nome renomeado.<br><br>
Uma sugestão, é não utilizar o 'restart' na tabela para renomear um campo se já tiver dados cadastrados com o nome do campo antigo, pois o 'restart' só reescreverá as regras dos campos no cache, enquanto o renameField irá alterar o nome do campo no cache da migration e ao mesmo tempo alterar o nome do campo antigo para o novo, nas linhas de dados já adicionados na tabela.<br> Porém se não houver nenhum dado adicionado ainda, é melhor e mais prático apenas restartar a tabela com a correção no nome do campo.
<hr>

* <strong>Dropar campos:</strong><br>
Para utilizar o 'table.dropField' assim como o 'renameTable' e 'renameField', é necessário passar um objeto contendo a migration. Veja o exemplo:
```js
userTable.dropField("age", {migration: "drop_field"});
```
Aqui, estamos deletando da tabela instânciada no 'userTable', que nesse caso é a tabela "user", o campo "age", o sync-localdb identificará se ja foi ou não executada através da migration.<br><br>
Uma sugestão, que foi dado no 'renameField' mas que também serve para o 'dropField', é que o ideal apenas utilizar o 'restart' para remover campos da tabela no caso de não houver dados adicionados com a estrutura da tabela anterior, pois quando restarta a tabela ele apenas reescreve as regras dos campos no cache das migrations, enquanto o 'dropField' ira remover o campo do cache das migrations e remover tambem de cada linha adicionada nessa tabela.  
</div>
<hr>
<div id="mudance04">
    <h3>Monitoramento de migrations</h3>
    Assim como na versão já tinha o monitoramento de tables, que servia deletar automaticamente tabelas que não estão mais em utilização, por padrão depois de 3 minutos que o código foi executado, porém pode ser mudado para até 0.25 minutos (15 segundos) na hora de instanciar o Localdb. Na versão 2.0, as migrations também tem esse controle, ao mesmo tempo que ira remover as tabelas que não estão em utilização, também removerá as migrations que não estão mais sendo executadas. Mas no caso das migrations, o usuário precisa utilizar o localdb.clearMigrations, que fará com que o sync-localdb monitore as migrations ativas.<br><br>
    Pode ser bastante útil para no caso de um 'restart' em uma tabela, para restartar é necessário mudar a migration, ou seja a migration antiga ficará em desuso, porém se você esquecer que já tinha sido executada e utilizar em uma outra função "ddl", ela não será executada. Então pode ser interessante utilizar essa função em situações como essas.<br><br>

```js
const localdb = new Localdb(1); // O valor passado será multiplicado por 60, ou seja esse 1 é equivalente a 60s ou a 1m.
localdb.clearMigrations();
```
No exemplo acima, as migrations que não foram utilizadas nessa executação, serão deletados do cache em 1 minutos após rodar o código.
</div>
</div>

