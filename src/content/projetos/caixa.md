---
titulo: Caixa
resumo: API de contas digitais com transferências seguras, mesmo com acessos ao mesmo tempo.
tipo: Pessoal
quando: "2026, em construção"
ano: 2026
semLink: "O código entra no GitHub junto com a primeira versão."
imagem: ../../assets/projetos/caixa.jpg
stack: [java, postgresql, docker, git]
extras: [Spring Boot, Spring Security, JUnit, Testcontainers, Flyway]
ordem: 3
---

Uma API REST de contas digitais: abrir conta, depositar, sacar, transferir entre contas e ver o extrato. É pequena de propósito, para caprichar nas regras que um banco não pode errar: o saldo nunca fica negativo, a transferência acontece inteira ou não acontece, e o histórico não se apaga.

- **Contas:** cadastro de cliente e abertura de conta, com validação de CPF.
- **Operações:** depósito, saque e transferência com `BigDecimal` e bloqueio no banco, para dois pedidos ao mesmo tempo não criarem nem sumirem dinheiro. A mesma transferência enviada duas vezes só acontece uma.
- **Extrato:** paginado e filtrado por período.
- **Segurança:** login com JWT pelo Spring Security; cada cliente só vê a própria conta.
- **Erros:** respostas padronizadas (`ProblemDetail`) e validação dos dados de entrada.
- **Testes:** JUnit e Mockito nas regras, testes de integração com um PostgreSQL de verdade (Testcontainers) e um teste de transferências simultâneas que confere se o saldo fecha.
