---
titulo: Concilia
resumo: Robô que cruza o extrato do banco com a planilha da empresa e aponta o que não bate.
tipo: Pessoal
quando: "2026, em construção"
ano: 2026
semLink: "O código entra no GitHub junto com a primeira versão."
imagem: ../../assets/projetos/concilia.jpg
stack: [python, apis, docker, git]
extras: [pandas, FastAPI, openpyxl]
ordem: 5
---

Um robô de conciliação: pega o extrato do banco e a planilha de lançamentos da empresa, cruza os dois e aponta o que não bate. É um trabalho que muita empresa ainda faz à mão, e continua a linha das automações que fiz na Clarios.

- **Leitura:** extratos em CSV, OFX e Excel, com limpeza de datas, valores com vírgula e descrições bagunçadas.
- **Regras:** primeiro valor e data exatos; depois uma tolerância de dias e descrições parecidas.
- **Relatório:** planilha com abas de conciliado, pendente e divergente, e um resumo por e-mail.
- **Agenda:** roda pela linha de comando ou sozinho todo dia, com registro do que foi feito. Uma API pequena em FastAPI recebe os arquivos e devolve o relatório.
- **Dados:** extratos de exemplo gerados por script, nunca dados reais.
- **Testes:** pytest com os casos difíceis: mesmo valor em dois dias, estorno e centavos.
