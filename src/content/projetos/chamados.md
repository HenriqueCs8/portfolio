---
titulo: Chamados
resumo: Sistema de chamados de suporte interno, com API em Java e telas em Angular.
tipo: Pessoal
quando: "2026, em construção"
ano: 2026
semLink: "O código entra no GitHub junto com a primeira versão."
imagem: ../../assets/projetos/chamados.jpg
stack: [java, angular, ts, postgresql, docker, git]
extras: [Spring Boot, Spring Security, JUnit]
ordem: 4
---

Um sistema de chamados de suporte interno: o funcionário abre um chamado, o time de TI atende, comenta e fecha. As telas em Angular são simples de propósito.

- **API:** chamados com status (aberto, em atendimento, resolvido), prioridade, responsável, comentários e histórico de cada mudança, com busca e filtros paginados.
- **Perfis:** solicitante e atendente, com login por JWT no Spring Security.
- **Telas:** login, lista com filtros, detalhe com comentários e formulário de novo chamado, em componentes standalone com signals, rotas protegidas e um interceptor que envia o token.
- **Experiência:** formulários com validação e mensagens claras, e estados de carregando, vazio e erro em todas as telas.
- **Testes:** JUnit na API; no Angular, testes dos serviços e do formulário.
