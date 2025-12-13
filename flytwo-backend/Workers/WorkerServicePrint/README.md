# WorkerServicePrint (FlyTwo) - Print Worker

Worker responsavel por processar jobs de impressao/relatorios (PDF/XLSX) com FastReport.

## O que este worker faz (em uma frase)

Ele fica escutando uma fila do RabbitMQ e, quando chega um job, busca os dados do relatorio na API, gera o arquivo com FastReport, salva no S3 e publica progresso/resultado no Redis para a API repassar via SignalR.

## Visao geral

Fluxo (alto nivel):
1) Frontend cria um job na API (`POST /api/print/jobs`)
2) API grava `PrintJob` + `OutboxMessage` na mesma transacao
3) `OutboxRelayService` publica no RabbitMQ (fila `flytwo.print.jobs`)
4) Este worker consome a fila, busca o *work item* na API e gera o arquivo via FastReport
5) O arquivo final e enviado para o S3 e o worker publica progresso/resultado via Redis Pub/Sub
6) A API consome o Redis e envia progresso via SignalR (`/hubs/print`) + cria notificacao ao concluir/falhar

## Estrutura do projeto (pastas/arquivos)

```
Workers/WorkerServicePrint/
- Program.cs                 # bootstrap/DI/config; carrega .env; registra o Worker
- Worker.cs                  # consumidor RabbitMQ; orquestra o processamento do job
- appsettings.json           # config default (RabbitMQ/Redis/API/S3)
- appsettings.Development.json
- .env.example               # exemplo de variaveis AWS
- .env                       # (IGNORADO pelo git) suas credenciais AWS
- DLL/                       # FastReport.dll e FastReport.Web.dll (copiados pro output)
- Templates/                 # arquivos .frx (um por relatorio)
- Models/                    # contratos (mensagens) Rabbit/Redis e resposta do work-item
- Options/                   # classes de configuracao tipada (RabbitMqOptions, etc.)
- Services/                  # integracoes (API client, Redis, S3, renderizador FastReport, etc.)
```

### O que cada parte faz

- `Program.cs`
  - Lê `Workers/WorkerServicePrint/.env` (se existir) e coloca as variaveis no ambiente do processo.
  - Faz o bind de configuracao (`RabbitMq`, `Redis`, `PrintApi`, `S3`) e registra os servicos no DI.
  - Configura `HttpClient` apontando para a API (`PrintApi:BaseUrl`).
  - Registra `Worker` como `HostedService`.

- `Worker.cs`
  - Conecta no RabbitMQ e consome a fila `flytwo.print.jobs`.
  - Para cada mensagem:
    1) Desserializa o JSON (modelo `Models/PrintJobQueuedMessage.cs`).
    2) Chama a API interna para buscar o *work item* (dados + parametros) via `Services/PrintApiClient.cs`.
    3) Publica eventos de progresso no Redis via `Services/RedisPublisher.cs` (canal `flytwo:print:events`).
    4) Renderiza o relatorio via `Services/FastReportRenderer.cs` usando o `.frx` correto.
    5) Faz upload no S3 e gera uma URL assinada (pre-signed URL) via `Services/S3Uploader.cs`.
    6) Publica `completed` (ou `failed`) no Redis com `outputUrl`/`errorMessage`.

- `Services/PrintApiClient.cs`
  - Faz `GET /api/print/internal/jobs/{id}/work-item`.
  - Envia `X-Worker-Api-Key` (precisa bater com a config da API).

- `Services/ReportTemplateRegistry.cs`
  - Mapa `reportKey -> arquivo .frx`.
  - O objetivo e suportar centenas de relatorios no futuro sem mudar a logica do Worker: so adiciona o template e o mapeamento.

- `Services/FastReportRenderer.cs`
  - Carrega o `.frx` do disco e registra os datasets a partir do JSON recebido da API.
  - Exporta PDF/XLSX (via reflection) usando as DLLs do FastReport que estao em `DLL/`.

- `Services/S3Uploader.cs`
  - Faz upload do arquivo gerado no bucket S3 (`AWS_S3_BUCKET`).
  - Retorna uma URL temporaria (pre-signed) e a data de expiracao.

- `Services/RedisPublisher.cs`
  - Publica no Redis Pub/Sub eventos `progress`, `completed`, `failed`.
  - A API escuta o canal e repassa ao frontend via SignalR.

- `Templates/*.frx`
  - O `.frx` define o layout e os campos esperados.
  - Importante: o nome do DataSource no `.frx` deve bater com a chave do dataset enviada pela API.

## Como rodar (local)

1) Suba a infraestrutura (Postgres/Redis/RabbitMQ):
   - `cd D:\FlyTwo`
   - `docker-compose up -d`

2) Configure o S3 (na pasta do worker):
   - Copie `Workers/WorkerServicePrint/.env.example` -> `Workers/WorkerServicePrint/.env`
   - Preencha:
     - `AWS_ACCESS_KEY_ID`
     - `AWS_SECRET_ACCESS_KEY`
     - `AWS_REGION`
     - `AWS_S3_BUCKET`

3) Garanta que a chave interna bate com a API:
   - API: `WebApplicationFlytwo/appsettings*.json` -> `Print:WorkerApiKey`
   - Worker: `Workers/WorkerServicePrint/appsettings*.json` -> `PrintApi:WorkerApiKey`
   - Header enviado pelo worker: `X-Worker-Api-Key`

4) Rode o worker:
   - `dotnet run -c Release --project Workers/WorkerServicePrint/WorkerServicePrint.csproj`

## Orientacoes (para quem esta comecando)

### 1) Validar que esta tudo no ar

- RabbitMQ UI: `http://localhost:15672` (user/pass default: `guest/guest`)
- Redis: `localhost:6379`
- API: `http://localhost:5110` (Swagger em `http://localhost:5110/swagger`)

### 2) Criar um job de teste (via Swagger)

No Swagger da API, chame `POST /api/print/jobs` com um body como:

```json
{ "reportKey": "weather-forecast", "format": 0, "parameters": { "days": 5 } }
```

Isso deve:
- Criar o job no banco (status `Queued`)
- Colocar uma mensagem no outbox
- O `OutboxRelayService` publica no RabbitMQ
- O worker consome e publica progresso no Redis
- A API repassa via SignalR (`/hubs/print`) e no final cria uma notificacao (sino do frontend)

### 3) Onde olhar quando algo nao funciona

- Logs da API: veja se `OutboxRelayService` esta ativo e publicando
- RabbitMQ UI: verifique se a fila `flytwo.print.jobs` existe e se tem mensagens
- Logs do worker: verifique se ele conectou no Rabbit e se esta conseguindo buscar o work item na API
- S3: verifique se o arquivo foi criado no bucket, e se a URL retornada abre

## Configuracao (appsettings.json)

`Workers/WorkerServicePrint/appsettings.json`:
- `RabbitMq:*`:
  - `HostName`, `Port`, `UserName`, `Password`, `VirtualHost`, `QueueName`
- `Redis:*`:
  - `ConnectionString` (ex.: `localhost:6379`)
  - `Channel` (default: `flytwo:print:events`)
- `PrintApi:*`:
  - `BaseUrl` (ex.: `http://localhost:5110/`)
  - `WorkerApiKey`
- `S3:*`:
  - `OutputPrefix` (default: `reports`)
  - `PreSignedUrlExpiryHours` (default: `24`)

## Templates FastReport (.frx)

Templates ficam em `Workers/WorkerServicePrint/Templates/`.

Report keys suportadas (mapeadas em `Workers/WorkerServicePrint/Services/ReportTemplateRegistry.cs`):
- `weather-forecast` -> `Templates/WeatherForecastReport.frx`
- `products` -> `Templates/ProductsReport.frx`

Para adicionar um novo relatorio (passo-a-passo):
1) Crie/coloque o `.frx` em `Templates/`.
2) Garanta que o `.frx` usa um DataSource com o nome correto (ex.: `Products`, `WeatherForecastList`, etc).
3) Adicione o mapeamento em `Services/ReportTemplateRegistry.cs`.
4) Garanta que o `.frx` seja copiado para output (no `.csproj` do worker: item `<None Update="Templates\\SeuRelatorio.frx">`).
5) No lado da API, implemente o dataset do relatorio no endpoint interno (work item) e registre o `reportKey`/validator.

## Contratos (mensagens)

RabbitMQ (fila `flytwo.print.jobs`):
- JSON publicado pela API (outbox relay), ex.:
  - `{ "messageType": "PrintJobQueuedV1", "jobId": "guid", "occurredAtUtc": "..." }`

API (work item interno):
- `GET /api/print/internal/jobs/{id}/work-item`
- Header: `X-Worker-Api-Key: <WorkerApiKey>`
- Retorna:
  - `jobId`, `empresaId`, `createdByUserId`, `reportKey`, `format`, `parameters`, `data`

Redis Pub/Sub (canal `flytwo:print:events`):
- Eventos publicados pelo worker:
  - `type=progress` (atualizacao incremental)
  - `type=completed` (inclui `outputUrl` e `outputExpiresAtUtc`)
  - `type=failed` (inclui `errorMessage`)

## Troubleshooting (problemas comuns)

- Nao chega mensagem no worker:
  - A API precisa estar rodando com `OutboxRelayService` ativo.
  - Confira se o RabbitMQ esta acessivel e se a fila `flytwo.print.jobs` existe.
  - Se a API estiver rodando em Debug e o bin estiver travado, use `--configuration Release` para migrations/build.

- Worker recebe mensagem mas nao consegue buscar work item:
  - Verifique `PrintApi:BaseUrl` (deve apontar para a API correta).
  - Verifique `PrintApi:WorkerApiKey` == `Print:WorkerApiKey` na API.

- S3 falha:
  - Confirme `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` no `.env`.
  - Confirme permissoes IAM (PutObject + GetObject/Presign) e bucket existente.

- Template nao encontrado:
  - Confirme se o `.frx` esta em `Templates/` e se esta sendo copiado para o output pelo `.csproj`.

## Observacoes de seguranca

- Nao commite `.env` com credenciais AWS.
- `WorkerApiKey` e uma credencial interna (trate como secret).
