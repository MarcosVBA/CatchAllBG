import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../monstros.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'Script do editor ausente');
const monstros = await readFile(new URL('../../cartas/monstros.csv', import.meta.url), 'utf8');
const habilidades = await readFile(new URL('../../cartas/habilidades.csv', import.meta.url), 'utf8');

function criarEditor(url = URL) {
  class Elemento {
    constructor() { this.value = ''; this.textContent = ''; this.hidden = false; this.children = []; this.listeners = {}; this.classList = { toggle() {} }; }
    addEventListener(tipo, fn) { this.listeners[tipo] = fn; }
    replaceChildren(...filhos) { this.children = filhos; }
    append(...filhos) { this.children.push(...filhos); }
    setAttribute() {}
    scrollIntoView() {}
    click() { return this.listeners.click?.({ preventDefault() {} }); }
  }
  const elementos = new Map();
  const get = id => { if (!elementos.has(id)) elementos.set(id, new Elemento()); return elementos.get(id); };
  const contexto = vm.createContext({ document: { getElementById: get, createElement: () => new Elemento() }, window: { addEventListener() {} }, confirm: () => true, URL: url, Blob, setTimeout });
  vm.runInContext(script, contexto);
  return { get, executar: s => vm.runInContext(s, contexto), contexto };
}

test('CSV preserva campos e caracteres especiais ao editar', () => {
  const e = criarEditor();
  e.contexto.texto = monstros;
  e.executar('carregarMonstros(texto, null)');
  const descricao = 'Texto com vírgula, "aspas" e\nsegunda linha';
  e.contexto.descricao = descricao;
  e.executar('estado.monstros.linhas[0].descricao_monstro = descricao');
  const alterado = e.executar('gerarCsv(estado.monstros)');
  e.contexto.alterado = alterado;
  assert.equal(e.executar('lerCsv(alterado).linhas[0].descricao_monstro'), descricao);
  assert.equal(e.executar('lerCsv(alterado).linhas.length'), 59);
  assert.equal(e.executar('lerCsv(alterado).linhas[1].estrategia_monstro'), e.executar('lerCsv(texto).linhas[1].estrategia_monstro'));
});

test('prévias opcionais usam caminhos dos CSVs, navegam e liberam imagens anteriores', () => {
  const revogadas = [], arquivos = [];
  const url = { createObjectURL(arquivo) { arquivos.push(arquivo); return `blob:${arquivos.length}`; }, revokeObjectURL(valor) { revogadas.push(valor); } };
  const e = criarEditor(url);
  e.contexto.texto = monstros; e.contexto.cartas = habilidades;
  e.executar('carregarMonstros(texto, null); carregarHabilidades(cartas)');
  assert.equal(e.get('imagem-monstro').children.length, 0);
  e.contexto.imagens = [
    { webkitRelativePath: 'imagens/monstros/1.png' },
    { webkitRelativePath: 'imagens/monstros/2.png' },
    { webkitRelativePath: 'imagens/habilidades/11.png' },
    { webkitRelativePath: 'imagens/monstros/1_1.png' },
  ];
  e.executar('carregarImagens(imagens)');
  assert.match(e.get('estado-imagens').textContent, /3 imagem/);
  let imagem = e.get('imagem-monstro').children[0];
  assert.match(imagem.alt, /krakon/i);
  assert.equal(imagem.hidden, true);
  imagem.listeners.load();
  assert.equal(imagem.hidden, false);
  imagem.listeners.error();
  assert.equal(imagem.hidden, true);
  const habilidade = e.get('habilidades').children.find(bloco => bloco.children[0].textContent.includes('11'));
  assert.match(habilidade.children[4].alt, /ilustração/i);
  e.executar('navegar(1)');
  imagem = e.get('imagem-monstro').children[0];
  assert.match(imagem.alt, /krakuron/i);
  const campoImagem = e.get('formulario').children.find(campo => campo.children[1].id === 'campo-imagem').children[1];
  campoImagem.value = 'monstros/999.png';
  campoImagem.listeners.input();
  assert.equal(e.get('imagem-monstro').children.length, 0);
  e.executar('carregarImagens([])');
  assert.equal(revogadas.length, arquivos.length);
  assert.equal(e.get('imagem-monstro').children.length, 0);
});

test('habilidades incluem inatas, melhorias e herança anterior à evolução', () => {
  const e = criarEditor();
  e.contexto.texto = monstros; e.contexto.cartas = habilidades;
  e.executar('carregarMonstros(texto, null); carregarHabilidades(cartas)');
  assert.deepEqual(Array.from(e.executar('habilidadesDo(estado.monstros.linhas.find(m => m.id_monstro === "4"))').entries(), par => Array.from(par)), [['15', 'Herdada'], ['63', 'Herdada'], ['39', 'Inata']]);
  const links = e.get('habilidades').children;
  assert.ok(links.length > 0);
  const m = e.executar('estado.monstros.linhas.find(m => m.id_monstro === "4")');
  assert.equal(m.nome_monstro, 'owlsel');
  e.executar('estado.indice = estado.monstros.linhas.findIndex(m => m.id_monstro === "3"); atualizar()');
  const bolha = e.get('habilidades').children.find(bloco => bloco.children[0].textContent.startsWith('Bolha de água'));
  const nomes = bolha.children[3].children.map(link => link.textContent);
  assert.ok(nomes.some(nome => nome.startsWith('owlzin')));
  assert.ok(nomes.some(nome => nome.startsWith('owlsel')));
  assert.ok(nomes.some(nome => nome.startsWith('Borbulião')));
  bolha.children[3].children.find(link => link.textContent.startsWith('owlsel')).click();
  assert.match(e.get('titulo').textContent, /owlsel/);
});

test('salva no arquivo selecionado e protege edição externa', async () => {
  const e = criarEditor(); let arquivo = monstros, escrito = '';
  const handle = { async getFile() { return { async text() { return arquivo; } }; }, async createWritable() { return { async write(v) { escrito = v; }, async close() { arquivo = escrito; } }; } };
  e.contexto.texto = monstros; e.contexto.cartas = habilidades; e.contexto.handle = handle;
  e.executar('carregarMonstros(texto, handle); carregarHabilidades(cartas); estado.monstros.linhas[0].nome_monstro = "Krakon teste"; estado.sujo = true');
  await e.get('salvar').click();
  assert.match(escrito, /Krakon teste/);
  assert.match(e.get('status').textContent, /atualizado/);
  arquivo += '\n'; escrito = '';
  await e.get('salvar').click();
  assert.equal(escrito, '');
  assert.match(e.get('status').textContent, /alterado fora do editor/);
});
