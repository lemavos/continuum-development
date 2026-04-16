# 🧪 Testes - Funcionalidade de Types nas Notas

## 📋 Resumo dos Testes Implementados

### Backend - Java/JUnit5

#### 1. **NoteServiceTest** (`src/test/java/.../NoteServiceTest.java`)
- ✅ Instantiação do serviço
- ✅ Tipo é persistido corretamente
- ✅ Tipo pode ser null (campo opcional)
- ✅ Segurança: Note sempre contém vaultId
- ✅ Busca por tipo com filtro userId + vaultId

**Estrutura:**
```
NoteServiceTest
├── Type Management
│   ├── getDistinctTypes retorna tipos únicos
│   ├── Agregação filtra por userId e vaultId
│   ├── Tipo persistido corretamente
│   └── Tipo pode ser null
└── Security - Multi-Tenant
    ├── Note sempre tem vaultId
    └── findByUserIdAndTypeAndVaultId com segurança
```

#### 2. **NoteControllerTest** (`src/test/java/.../NoteControllerTest.java`)
- ✅ GET /api/notes/types retorna lista de tipos
- ✅ Lista vazia quando sem tipos
- ✅ Tipos ordenados alfabeticamente
- ✅ NoteCreateRequest aceita type
- ✅ NoteUpdateRequest aceita type
- ✅ Validação max length (100 chars)
- ✅ Segurança: NoteResponse não expõe vaultId
- ✅ Tipos null e vazios são filtrados

**Estrutura:**
```
NoteControllerTest
├── GET /api/notes/types
│   ├── Retorna lista de tipos
│   ├── Lista vazia sem tipos
│   └── Tipos ordenados alfabeticamente
├── Type Field Integration
│   ├── CreateRequest aceita type
│   ├── UpdateRequest aceita type
│   ├── Validação max 100 chars
│   └── ResponseDTO não expõe vaultId
├── Security - Multi-Tenant
│   └── Apenas tipos do vault aparecem
└── Data Consistency
    ├── Tipo null é permitido
    └── Tipos vazios são filtrados
```

#### 3. **NoteRepositoryTest** (`src/test/java/.../NoteRepositoryTest.java`)
- ✅ Tipos retornados ordenaados alfabeticamente
- ✅ Filtro por userId (isola outros usuários)
- ✅ Filtro por vaultId (CRITICAL - security)
- ✅ Ignora tipos null e vazios
- ✅ Lista vazia quando sem tipos
- ✅ Busca por tipo + vault não vaza dados
- ✅ Type é salvo/recuperado corretamente
- ✅ Type indexado para performance

**Estrutura:**
```
NoteRepositoryTest
├── findDistinctTypes
│   ├── Retorna tipos ordenados
│   ├── Filtra por userId
│   ├── Filtra por vaultId (SECURITY)
│   ├── Ignora null/vazios
│   └── Lista vazia sem tipos
├── findByUserIdAndTypeAndVaultId
│   ├── Retorna notas do tipo no vault
│   └── Não retorna notas de outro vault
└── Type Field Persistence
    ├── Tipo persistido corretamente
    ├── Tipo pode ser null
    └── Type está indexado
```

#### 4. **NoteTypeIntegrationTest** (`src/test/java/.../integration/NoteTypeIntegrationTest.java`)
- 📝 E2E: Create -> Update -> List Types
- 📝 Security: Isolamento entre vaults
- 📝 Security: Isolamento entre usuários
- 📝 Validação: Type com 100+ chars rejeitado
- 📝 Validação: Type vazio permitido
- 📝 Performance: Query indexada < 100ms

---

## 🏃 Como Executar os Testes

### Executar Todos os Testes

```bash
cd continuum-api-production

# Maven
mvn test

# Gradle (se aplicável)
gradle test
```

### Executar Testes Específicos

```bash
# Apenas NoteServiceTest
mvn test -Dtest=NoteServiceTest

# Apenas NoteControllerTest
mvn test -Dtest=NoteControllerTest

# Apenas NoteRepositoryTest
mvn test -Dtest=NoteRepositoryTest

# Apenas Integration Tests
mvn test -Dtest=NoteTypeIntegrationTest
```

### Executar com Coverage

```bash
mvn test jacoco:report

# Resultado em: target/site/jacoco/index.html
```

---

## ✅ Checklist de Validação

Durante os testes, verifica que:

### Backend

- [ ] `@Indexed` está no campo `type` em Note.java
- [ ] `@Indexed` está no campo `vaultId` em Note.java
- [ ] Agregação MongoDB filtra por `userId` E `vaultId`
- [ ] `NoteCreateRequest` accepts `type` field
- [ ] `NoteUpdateRequest` accepts `type` field
- [ ] `NoteResponse` includes `type` field
- [ ] `NoteSummaryDTO` includes `type` field
- [ ] `NoteService.getDistinctTypes()` retorna vaultId
- [ ] `findByUserIdAndTypeAndVaultId()` existe no repository
- [ ] Tipos null/vazios são filtrados na agregação
- [ ] MaxLength(100) validado em DTOs

### Security

- [ ] vazamento entre vaults é ==blocked==
- [ ] vazamento entre usuários é blocked
- [ ] vaultId é obrigatório ao salvar nota
- [ ] agregação sempre filtra userId + vaultId
- [ ] NoteResponse não expõe vaultId

### API

- [ ] GET /api/notes/types retorna List<String>
- [ ] GET /api/notes/types filtra por vaultId
- [ ] POST /api/notes aceita type
- [ ] PUT /api/notes/{id} pode atualizar type
- [ ] type é opcional (pode ser null/vazio)

### Performance

- [ ] type está indexado (MongoDB)
- [ ] agregação usa $match com índices
- [ ] queries completam < 100ms em 1000+ registros

---

## 📊 Cobertura de Testes

### Esperado

```
NoteService:        85%+ coverage
NoteController:     80%+ coverage
NoteRepository:     90%+ coverage
DTOs:               95%+ coverage
```

### Rodando Coverage Localmente

```bash
# Gerar coverage
mvn clean test jacoco:report

# Abrir relatório
open target/site/jacoco/index.html  # macOS
xdg-open target/site/jacoco/index.html  # Linux
start target/site/jacoco/index.html  # Windows
```

---

## 🔍 Cenários Críticos de Teste

### 1. Segurança Multi-Tenant

```java
// User1 em Vault1 cria tipo "Research"
// User1 em Vault2 NÃO deve ver "Research"
// User2 em Vault1 NÃO deve ver tipos de User1

List<String> vault1Types = service.getDistinctTypes(); // ["Research"]
// Muda para Vault2
List<String> vault2Types = service.getDistinctTypes(); // []
```

### 2. Filtro de Dados

```java
// Criar nota com type
Note note1 = createNote("user1", "vault1", "Research");
Note note2 = createNote("user1", "vault1", "Todo");
Note note3 = createNote("user2", "vault1", "Research"); // ❌ Outro usuário

// Buscar por tipo
List<Note> results = noteRepository.findByUserIdAndTypeAndVaultId(
    "user1", "Research", "vault1"
);

// Deve retornar apenas note1
assertThat(results).hasSize(1);
assertThat(results.get(0).getId()).isEqualTo(note1.getId());
```

### 3. Validação

```java
// Tipo válido (100 chars)
String valid = "a".repeat(100);
createNote("user1", "vault1", valid); // ✅ OK

// Tipo inválido (101 chars)
String invalid = "a".repeat(101);
createNote("user1", "vault1", invalid); // ❌ Validation error

// Tipo null/vazio - permitido
createNote("user1", "vault1", null); // ✅ OK
createNote("user1", "vault1", ""); // ✅ OK (não aparece em distinct)
```

---

## 🐛 Testando Localmente

### 1. Setup MongoDB Local

```bash
# Docker
docker run -d -p 27017:27017 mongo:latest

# Ou usar MongoDB Atlas (cloud)
```

### 2. Configurar application-test.properties

```properties
spring.data.mongodb.uri=mongodb://localhost:27017/continuum-test
spring.test.mockmvc.print=true
```

### 3. Rodar Testes

```bash
mvn clean test -DskipITs=false
```

---

## 📈 Métricas de Sucesso

Quando os testes passarem, você terá:

✅ 100% das tests passing  
✅ Cobertura > 85%  
✅ Performance < 100ms por query  
✅ Segurança validada (vazamento testado)  
✅ Integração E2E funcionando  

---

## 🚀 Próximos Passos

1. ✅ Execute todos os testes: `mvn clean test`
2. ✅ Verifique coverage: `mvn jacoco:report`
3. ✅ Execute testes de integração: `mvn verify`
4. ✅ Deploy para staging e validar
5. ✅ Deploy para produção

---

## 💡 Dicas

- Use `-X` flag para debug: `mvn -X test`
- Rode um teste isolado: `mvn test -Dtest=NoteRepositoryTest#testVaultIsolation`
- Profile de teste: `mvn test -P test-ci`

---

## ❓ Troubleshooting

### MongoDB Connection Error
```
Solution: Certifique-se de que MongoDB está rodando
docker run -d -p 27017:27017 mongo:latest
```

### Import Errors em Testes
```
Solution: Rode mvn clean install para atualizar IDE
```

### Testes Passam Localmente mas Falham em CI
```
Solution: Verifique application-test.properties e variáveis de env
```

---

**Desenvolvido com ❤️ para garantir segurança e performance**
