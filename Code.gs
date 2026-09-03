/************************************************************
 * API FINANCEIRA - GOOGLE APPS SCRIPT
 * Banco de dados: Google Sheets
 *
 * Abas:
 * 1. CONTAS
 * 2. MOVIMENTAÇÕES
 ************************************************************/


/* ==========================================================
   CONFIGURAÇÃO
   ========================================================== */

// Se este Apps Script estiver vinculado à própria planilha,
// pode deixar vazio.
//
// Se preferir informar o ID da planilha manualmente,
// coloque entre as aspas.
//
// Exemplo:
// const SPREADSHEET_ID = "1AbCdEfGhIjKlMnOp...";
//
const SPREADSHEET_ID = "";


/* Nome das abas */
const ABA_CONTAS = "CONTAS";
const ABA_MOVIMENTACOES = "MOVIMENTAÇÕES";


/* Cabeçalhos esperados */
const CABECALHO_CONTAS = [
  "ID",
  "DESCRIÇÃO",
  "BANCO",
  "TITULAR CONTA"
];

const CABECALHO_MOVIMENTACOES = [
  "DATA",
  "ID",
  "ID CONTA",
  "ID CONTA DESTINO",
  "TIPO",
  "VALOR",
  "VALOR RENDIMENTO",
  "DETALHAMENTO",
  "DESCRIÇÃO",
  "BANCO",
  "BANCO DESTINO",
  "TITULAR CONTA",
  "TITULAR DESTINO"
];


/* ==========================================================
   FUNÇÃO PRINCIPAL - GOOGLE SHEETS
   ========================================================== */

function getSpreadsheet() {

  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (!ss) {
    throw new Error(
      "Não foi possível localizar a planilha. " +
      "Informe o SPREADSHEET_ID no código."
    );
  }

  return ss;
}


/* ==========================================================
   DO GET
   ========================================================== */

function doGet(e) {

  try {

    const params = e && e.parameter ? e.parameter : {};

    const action = params.action || "ping";

    let result;

    switch (action) {

      case "ping":
        result = {
          success: true,
          message: "API funcionando corretamente.",
          timestamp: new Date().toISOString()
        };
        break;


      case "getAccounts":
        result = getAccounts();
        break;


      case "getTransactions":
        result = getTransactions();
        break;


      case "getAll":
        result = getAll();
        break;


      default:
        result = {
          success: false,
          message: "Ação GET não reconhecida: " + action
        };
    }

    return createResponse(e, result);

  } catch (error) {

    return createResponse(e, {
      success: false,
      message: error.message || String(error)
    });
  }
}


/* ==========================================================
   DO POST
   ========================================================== */

function doPost(e) {

  let result;

  try {

    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Nenhum dado foi recebido.");
    }

    const body = JSON.parse(e.postData.contents);

    const action = body.action;

    const data = body.data || {};

    if (!action) {
      throw new Error("A ação não foi informada.");
    }

    switch (action) {

      case "createAccount":
        result = createAccount(data);
        break;


      case "updateAccount":
        result = updateAccount(data);
        break;


      case "deleteAccount":
        result = deleteAccount(data);
        break;


      case "createTransaction":
        result = createTransaction(data);
        break;


      case "updateTransaction":
        result = updateTransaction(data);
        break;


      case "deleteTransaction":
        result = deleteTransaction(data);
        break;


      default:
        throw new Error(
          "Ação POST não reconhecida: " + action
        );
    }

  } catch (error) {

    result = {
      success: false,
      message: error.message || String(error)
    };
  }

  return createResponse(e, result);
}


/* ==========================================================
   RESPOSTA JSON
   ========================================================== */

function createResponse(e, data) {

  const json = JSON.stringify(data);

  /*
   * Permite também utilizar JSONP pelo parâmetro "callback".
   * Isso pode ser útil caso o navegador bloqueie alguma
   * requisição cross-origin.
   */

  const callback =
    e &&
    e.parameter &&
    e.parameter.callback
      ? e.parameter.callback
      : null;

  if (callback) {

    return ContentService
      .createTextOutput(
        callback + "(" + json + ")"
      )
      .setMimeType(
        ContentService.MimeType.JAVASCRIPT
      );
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(
      ContentService.MimeType.JSON
    );
}


/* ==========================================================
   BUSCAR CONTAS
   ========================================================== */

function getAccounts() {

  const sheet = getSheet(ABA_CONTAS);

  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {

    return {
      success: true,
      data: []
    };
  }

  const values = sheet
    .getRange(
      2,
      1,
      lastRow - 1,
      4
    )
    .getValues();

  const accounts = values
    .filter(row => row[0] !== "")
    .map(row => {

      return {
        id: String(row[0]),
        descricao: String(row[1] || ""),
        banco: String(row[2] || ""),
        titular: String(row[3] || "")
      };

    });

  return {
    success: true,
    data: accounts
  };
}


/* ==========================================================
   BUSCAR MOVIMENTAÇÕES
   ========================================================== */

function getTransactions() {

  const sheet = getSheet(ABA_MOVIMENTACOES);

  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {

    return {
      success: true,
      data: []
    };
  }

  const values = sheet
    .getRange(
      2,
      1,
      lastRow - 1,
      13
    )
    .getValues();

  const transactions = values
    .filter(row => row[1] !== "")
    .map(row => {

      return {
        data: formatDateForApi(row[0]),

        id: String(row[1]),

        idConta: String(row[2] || ""),

        idContaDestino: String(row[3] || ""),

        tipo: String(row[4] || ""),

        valor: Number(row[5]) || 0,

        valorRendimento:
          Number(row[6]) || 0,

        detalhamento:
          String(row[7] || ""),

        descricao:
          String(row[8] || ""),

        banco:
          String(row[9] || ""),

        bancoDestino:
          String(row[10] || ""),

        titularConta:
          String(row[11] || ""),

        titularDestino:
          String(row[12] || "")
      };

    });

  return {
    success: true,
    data: transactions
  };
}


/* ==========================================================
   BUSCAR TUDO
   ========================================================== */

function getAll() {

  return {
    success: true,
    contas: getAccounts().data,
    movimentacoes: getTransactions().data
  };
}


/* ==========================================================
   CRIAR CONTA
   ========================================================== */

function createAccount(data) {

  const descricao =
    cleanString(data.descricao);

  const banco =
    cleanString(data.banco);

  const titular =
    cleanString(data.titular);

  if (!descricao) {
    throw new Error(
      "A descrição da conta é obrigatória."
    );
  }

  if (!banco) {
    throw new Error(
      "O banco é obrigatório."
    );
  }

  if (!titular) {
    throw new Error(
      "O titular da conta é obrigatório."
    );
  }


  const lock =
    LockService.getScriptLock();

  lock.waitLock(30000);

  try {

    const sheet =
      getSheet(ABA_CONTAS);

    const id =
      generateNextId(sheet, 1); // Na aba CONTAS, o ID é a coluna A

    sheet.appendRow([
      id,
      descricao,
      banco,
      titular
    ]);

    return {
      success: true,
      message:
        "Conta criada com sucesso.",
      data: {
        id: String(id),
        descricao: descricao,
        banco: banco,
        titular: titular
      }
    };

  } finally {

    lock.releaseLock();
  }
}


/* ==========================================================
   EDITAR CONTA
   ========================================================== */

function updateAccount(data) {

  const id =
    cleanString(data.id);

  if (!id) {
    throw new Error(
      "O ID da conta é obrigatório."
    );
  }

  const descricao =
    cleanString(data.descricao);

  const banco =
    cleanString(data.banco);

  const titular =
    cleanString(data.titular);

  if (!descricao) {
    throw new Error(
      "A descrição da conta é obrigatória."
    );
  }

  if (!banco) {
    throw new Error(
      "O banco é obrigatório."
    );
  }

  if (!titular) {
    throw new Error(
      "O titular da conta é obrigatório."
    );
  }


  const sheet =
    getSheet(ABA_CONTAS);

  const row =
    findRowById(sheet, id, 1);

  if (!row) {
    throw new Error(
      "Conta não encontrada."
    );
  }


  sheet
    .getRange(row, 1, 1, 4)
    .setValues([
      [
        id,
        descricao,
        banco,
        titular
      ]
    ]);


  /*
   * Atualiza também as informações armazenadas
   * nas movimentações relacionadas à conta.
   */

  updateTransactionAccountReferences(
    id
  );


  return {
    success: true,
    message:
      "Conta atualizada com sucesso.",
    data: {
      id: id,
      descricao: descricao,
      banco: banco,
      titular: titular
    }
  };
}


/* ==========================================================
   EXCLUIR CONTA
   ========================================================== */

function deleteAccount(data) {

  const id =
    cleanString(data.id);

  if (!id) {
    throw new Error(
      "O ID da conta é obrigatório."
    );
  }


  /*
   * Verificar se existem movimentações
   * relacionadas à conta.
   */

  const transactionSheet =
    getSheet(ABA_MOVIMENTACOES);

  const lastRow =
    transactionSheet.getLastRow();


  if (lastRow > 1) {

    const values =
      transactionSheet
        .getRange(
          2,
          1,
          lastRow - 1,
          4
        )
        .getValues();


    const hasTransactions =
      values.some(row => {

        const idOrigem =
          String(row[2] || "");

        const idDestino =
          String(row[3] || "");

        return (
          idOrigem === id ||
          idDestino === id
        );
      });


    if (hasTransactions) {

      return {
        success: false,
        message:
          "Esta conta possui movimentações e não pode ser excluída."
      };
    }
  }


  const sheet =
    getSheet(ABA_CONTAS);

  const row =
    findRowById(sheet, id, 1);

  if (!row) {
    throw new Error(
      "Conta não encontrada."
    );
  }


  sheet.deleteRow(row);


  return {
    success: true,
    message:
      "Conta excluída com sucesso."
  };
}


/* ==========================================================
   CRIAR MOVIMENTAÇÃO
   ========================================================== */

function createTransaction(data) {

  const lock =
    LockService.getScriptLock();

  lock.waitLock(30000);

  try {

    const transactionSheet =
      getSheet(ABA_MOVIMENTACOES);


    /*
     * Validar dados
     */

    const tipo =
      cleanString(data.tipo)
        .toUpperCase();

    const idConta =
      cleanString(data.idConta);

    const idContaDestino =
      cleanString(data.idContaDestino);


    if (!["ENTRADA", "SAÍDA", "TRANSFERÊNCIA"]
      .includes(tipo)) {

      throw new Error(
        "Tipo de movimentação inválido."
      );
    }


    if (!idConta) {

      throw new Error(
        "A conta é obrigatória."
      );
    }


    /*
     * Verificar conta origem
     */

    const contaOrigem =
      findAccount(idConta);

    if (!contaOrigem) {

      throw new Error(
        "A conta de origem não foi encontrada."
      );
    }


    /*
     * Transferência
     */

    if (tipo === "TRANSFERÊNCIA") {

      if (!idContaDestino) {

        throw new Error(
          "A conta destino é obrigatória para transferências."
        );
      }


      if (idConta === idContaDestino) {

        throw new Error(
          "A conta de origem e a conta destino não podem ser iguais."
        );
      }


      const contaDestino =
        findAccount(idContaDestino);

      if (!contaDestino) {

        throw new Error(
          "A conta destino não foi encontrada."
        );
      }
    }


    /*
     * ENTRADA / SAÍDA
     */

    if (
      tipo === "ENTRADA" ||
      tipo === "SAÍDA"
    ) {

      if (idContaDestino) {

        throw new Error(
          "Conta destino somente deve ser utilizada em transferências."
        );
      }
    }


    /*
     * Valor
     */

    const valor =
      parseMoney(data.valor);

    const rendimento =
      parseMoney(
        data.valorRendimento
      );


    if (valor <= 0 && rendimento <= 0) {

      throw new Error(
        "Informe um valor ou rendimento maior que zero."
      );
    }


    /*
     * Data
     */

    const dataMovimentacao =
      parseDate(data.data);


    /*
     * ID
     */

    const id =
      generateNextId(transactionSheet, 2); // Na aba MOVIMENTAÇÕES, o ID é a coluna B


    /*
     * Dados automáticos
     */

    let bancoDestino = "";
    let titularDestino = "";


    if (tipo === "TRANSFERÊNCIA") {

      const contaDestino =
        findAccount(idContaDestino);

      bancoDestino =
        contaDestino.banco;

      titularDestino =
        contaDestino.titular;
    }


    /*
     * Salvar
     */

    transactionSheet.appendRow([

      dataMovimentacao,

      id,

      idConta,

      idContaDestino || "",

      tipo,

      valor,

      rendimento,

      cleanString(data.detalhamento),

      contaOrigem.descricao,

      contaOrigem.banco,

      bancoDestino,

      contaOrigem.titular,

      titularDestino

    ]);


    return {

      success: true,

      message:
        "Movimentação criada com sucesso.",

      data: {

        data:
          formatDateForApi(
            dataMovimentacao
          ),

        id:
          String(id),

        idConta:
          idConta,

        idContaDestino:
          idContaDestino || "",

        tipo:
          tipo,

        valor:
          valor,

        valorRendimento:
          rendimento,

        detalhamento:
          cleanString(data.detalhamento),

        descricao:
          contaOrigem.descricao,

        banco:
          contaOrigem.banco,

        bancoDestino:
          bancoDestino,

        titularConta:
          contaOrigem.titular,

        titularDestino:
          titularDestino
      }
    };

  } finally {

    lock.releaseLock();
  }
}


/* ==========================================================
   EDITAR MOVIMENTAÇÃO
   ========================================================== */

function updateTransaction(data) {

  const id =
    cleanString(data.id);

  if (!id) {
    throw new Error(
      "O ID da movimentação é obrigatório."
    );
  }


  const sheet =
    getSheet(ABA_MOVIMENTACOES);

  const row =
    findRowById(sheet, id, 2);

  if (!row) {
    throw new Error(
      "Movimentação não encontrada."
    );
  }


  const tipo =
    cleanString(data.tipo)
      .toUpperCase();

  const idConta =
    cleanString(data.idConta);

  const idContaDestino =
    cleanString(data.idContaDestino);


  if (!["ENTRADA", "SAÍDA", "TRANSFERÊNCIA"]
    .includes(tipo)) {

    throw new Error(
      "Tipo de movimentação inválido."
    );
  }


  if (!idConta) {

    throw new Error(
      "A conta é obrigatória."
    );
  }


  const contaOrigem =
    findAccount(idConta);

  if (!contaOrigem) {

    throw new Error(
      "Conta de origem não encontrada."
    );
  }


  if (tipo === "TRANSFERÊNCIA") {

    if (!idContaDestino) {

      throw new Error(
        "A conta destino é obrigatória."
      );
    }


    if (idConta === idContaDestino) {

      throw new Error(
        "A conta de origem e a conta destino não podem ser iguais."
      );
    }


    const contaDestino =
      findAccount(idContaDestino);

    if (!contaDestino) {

      throw new Error(
        "Conta destino não encontrada."
      );
    }
  }


  if (
    tipo !== "TRANSFERÊNCIA" &&
    idContaDestino
  ) {

    throw new Error(
      "Conta destino somente pode ser utilizada em transferências."
    );
  }


  const valor =
    parseMoney(data.valor);

  const rendimento =
    parseMoney(
      data.valorRendimento
    );


  if (valor <= 0 && rendimento <= 0) {

    throw new Error(
      "Informe um valor ou rendimento maior que zero."
    );
  }


  const dataMovimentacao =
    parseDate(data.data);


  let bancoDestino = "";
  let titularDestino = "";


  if (tipo === "TRANSFERÊNCIA") {

    const contaDestino =
      findAccount(idContaDestino);

    bancoDestino =
      contaDestino.banco;

    titularDestino =
      contaDestino.titular;
  }


  sheet
    .getRange(row, 1, 1, 13)
    .setValues([

      [

        dataMovimentacao,

        id,

        idConta,

        idContaDestino || "",

        tipo,

        valor,

        rendimento,

        cleanString(data.detalhamento),

        contaOrigem.descricao,

        contaOrigem.banco,

        bancoDestino,

        contaOrigem.titular,

        titularDestino

      ]

    ]);


  return {

    success: true,

    message:
      "Movimentação atualizada com sucesso.",

    data: {

      id: id,

      data:
        formatDateForApi(
          dataMovimentacao
        ),

      idConta:
        idConta,

      idContaDestino:
        idContaDestino || "",

      tipo:
        tipo,

      valor:
        valor,

      valorRendimento:
        rendimento,

      detalhamento:
        cleanString(data.detalhamento),

      descricao:
        contaOrigem.descricao,

      banco:
        contaOrigem.banco,

      bancoDestino:
        bancoDestino,

      titularConta:
        contaOrigem.titular,

      titularDestino:
        titularDestino
    }
  };
}


/* ==========================================================
   EXCLUIR MOVIMENTAÇÃO
   ========================================================== */

function deleteTransaction(data) {

  const id =
    cleanString(data.id);

  if (!id) {

    throw new Error(
      "O ID da movimentação é obrigatório."
    );
  }


  const sheet =
    getSheet(ABA_MOVIMENTACOES);

  const row =
    findRowById(sheet, id, 2);

  if (!row) {

    throw new Error(
      "Movimentação não encontrada."
    );
  }


  sheet.deleteRow(row);


  return {

    success: true,

    message:
      "Movimentação excluída com sucesso."
  };
}


/* ==========================================================
   BUSCAR UMA CONTA
   ========================================================== */

function findAccount(id) {

  const sheet =
    getSheet(ABA_CONTAS);

  const lastRow =
    sheet.getLastRow();

  if (lastRow <= 1) {
    return null;
  }


  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        4
      )
      .getValues();


  for (let i = 0; i < values.length; i++) {

    const row =
      values[i];

    if (
      String(row[0]) === String(id)
    ) {

      return {

        id:
          String(row[0]),

        descricao:
          String(row[1] || ""),

        banco:
          String(row[2] || ""),

        titular:
          String(row[3] || "")
      };
    }
  }


  return null;
}


/* ==========================================================
   LOCALIZAR LINHA ATRAVÉS DO ID
   ========================================================== */

function findRowById(
  sheet,
  id,
  idColumn
) {

  const lastRow =
    sheet.getLastRow();

  if (lastRow <= 1) {
    return null;
  }


  const values =
    sheet
      .getRange(
        2,
        idColumn,
        lastRow - 1,
        1
      )
      .getValues();


  for (let i = 0; i < values.length; i++) {

    if (
      String(values[i][0]) === String(id)
    ) {

      return i + 2;
    }
  }


  return null;
}


/* ==========================================================
   GERAR ID AUTOMÁTICO
   ========================================================== */

function generateNextId(sheet, idColumn) {

  idColumn = idColumn || 1;

  const lastRow =
    sheet.getLastRow();

  if (lastRow <= 1) {
    return 1;
  }


  const values =
    sheet
      .getRange(
        2,
        idColumn,
        lastRow - 1,
        1
      )
      .getValues();


  let maiorId = 0;


  values.forEach(row => {

    const numero =
      Number(row[0]);

    if (
      !isNaN(numero) &&
      numero > maiorId
    ) {

      maiorId = numero;
    }
  });


  return maiorId + 1;
}


/* ==========================================================
   ATUALIZAR REFERÊNCIAS DAS MOVIMENTAÇÕES
   ========================================================== */

function updateTransactionAccountReferences(
  accountId
) {

  const account =
    findAccount(accountId);

  if (!account) {
    return;
  }


  const sheet =
    getSheet(ABA_MOVIMENTACOES);

  const lastRow =
    sheet.getLastRow();

  if (lastRow <= 1) {
    return;
  }


  const range =
    sheet.getRange(
      2,
      1,
      lastRow - 1,
      13
    );

  const values =
    range.getValues();


  values.forEach(row => {

    const idOrigem =
      String(row[2] || "");

    const idDestino =
      String(row[3] || "");


    if (idOrigem === accountId) {

      row[8] =
        account.descricao;

      row[9] =
        account.banco;

      row[11] =
        account.titular;
    }


    if (idDestino === accountId) {

      row[10] =
        account.banco;

      row[12] =
        account.titular;
    }

  });


  range.setValues(values);
}


/* ==========================================================
   OBTER ABA
   ========================================================== */

function getSheet(sheetName) {

  const ss =
    getSpreadsheet();

  let sheet =
    ss.getSheetByName(sheetName);


  /*
   * Se a aba não existir, criar automaticamente
   * com os cabeçalhos corretos.
   */

  if (!sheet) {

    sheet =
      ss.insertSheet(sheetName);

    initializeSheet(sheet);
  }


  return sheet;
}


/* ==========================================================
   INICIALIZAR ABA
   ========================================================== */

function initializeSheet(sheet) {

  const name =
    sheet.getName();


  if (name === ABA_CONTAS) {

    sheet
      .getRange(
        1,
        1,
        1,
        CABECALHO_CONTAS.length
      )
      .setValues([
        CABECALHO_CONTAS
      ]);

    sheet
      .getRange("A:A")
      .setNumberFormat("0");
  }


  if (name === ABA_MOVIMENTACOES) {

    sheet
      .getRange(
        1,
        1,
        1,
        CABECALHO_MOVIMENTACOES.length
      )
      .setValues([
        CABECALHO_MOVIMENTACOES
      ]);

    sheet
      .getRange("A:A")
      .setNumberFormat("dd/MM/yyyy");

    sheet
      .getRange("F:G")
      .setNumberFormat(
        'R$ #,##0.00'
      );
  }


  sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .setFontWeight("bold");
}


/* ==========================================================
   CONVERTER VALOR MONETÁRIO
   ========================================================== */

function parseMoney(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return 0;
  }


  if (typeof value === "number") {

    if (isNaN(value)) {
      return 0;
    }

    return value;
  }


  let text =
    String(value)
      .trim()
      .replace(/R\$/gi, "")
      .replace(/\s/g, "");


  /*
   * Formato brasileiro:
   * 1.234,56
   */

  if (
    text.includes(",") &&
    text.includes(".")
  ) {

    text =
      text.replace(/\./g, "")
        .replace(",", ".");
  }

  else if (
    text.includes(",")
  ) {

    text =
      text.replace(",", ".");
  }


  const number =
    Number(text);


  if (isNaN(number)) {
    return 0;
  }


  return number;
}


/* ==========================================================
   CONVERTER DATA
   ========================================================== */

function parseDate(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    throw new Error(
      "A data é obrigatória."
    );
  }


  /*
   * Se já for uma data
   */

  if (
    Object.prototype.toString.call(value)
    === "[object Date]"
  ) {

    if (isNaN(value.getTime())) {

      throw new Error(
        "Data inválida."
      );
    }

    return value;
  }


  const text =
    String(value)
      .trim();


  /*
   * yyyy-MM-dd
   */

  let match =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );


  if (match) {

    const year =
      Number(match[1]);

    const month =
      Number(match[2]) - 1;

    const day =
      Number(match[3]);


    const date =
      new Date(
        year,
        month,
        day
      );


    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month ||
      date.getDate() !== day
    ) {

      throw new Error(
        "Data inválida."
      );
    }


    return date;
  }


  /*
   * dd/MM/yyyy
   */

  match =
    text.match(
      /^(\d{2})\/(\d{2})\/(\d{4})$/
    );


  if (match) {

    const day =
      Number(match[1]);

    const month =
      Number(match[2]) - 1;

    const year =
      Number(match[3]);


    const date =
      new Date(
        year,
        month,
        day
      );


    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month ||
      date.getDate() !== day
    ) {

      throw new Error(
        "Data inválida."
      );
    }


    return date;
  }


  /*
   * Última tentativa
   */

  const date =
    new Date(text);


  if (isNaN(date.getTime())) {

    throw new Error(
      "Data inválida."
    );
  }


  return date;
}


/* ==========================================================
   FORMATAR DATA PARA API
   ========================================================== */

function formatDateForApi(date) {

  if (!date) {
    return "";
  }


  if (
    Object.prototype.toString.call(date)
    !== "[object Date]"
  ) {

    date =
      new Date(date);
  }


  if (isNaN(date.getTime())) {
    return "";
  }


  const timezone =
    Session.getScriptTimeZone();


  return Utilities.formatDate(
    date,
    timezone,
    "yyyy-MM-dd"
  );
}


/* ==========================================================
   LIMPAR STRING
   ========================================================== */

function cleanString(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";
  }


  return String(value)
    .trim();
}


/* ==========================================================
   TESTES
   ========================================================== */

/*
 * Execute esta função manualmente no Apps Script
 * para verificar se a API consegue acessar a planilha.
 */

function testarAPI() {

  const resultado = {

    planilha:
      getSpreadsheet().getName(),

    contas:
      getAccounts(),

    movimentacoes:
      getTransactions()

  };


  Logger.log(
    JSON.stringify(
      resultado,
      null,
      2
    )
  );
}