# IMPLEMENTACIÓN

El propósito de este repo es demostrar la organización infrastructural de mi solución propuesta desde el punto de vista arquitectural y del desarrollador. Hay ciertas decisiones mejorables:

* Variables de entorno y outputs de stack
Esto no es seguro. La manera ideal de distribuir variables es haciendo uso de SecretsManager, pero en el contexto de una subnet privada, trae un costo; para acceder a SecretsManager y a STS, la VPC debe tener Interface Endpoints. Para los propósitos de este challenge, opté por usar una alternativa menos segura.

* CI/CD
Esta arquitectura está preparada para un flujo de GitHub Actions. Realizar el despliegue desde la línea de comandos local es mala práctica, y la organización de dependencias que elegí causaría mucha incomodidad manejada localmente; para aprovechar los Layers de AWS Lambda, es necesario que las instalaciones de producción no incluyan librerías pesadas como Nest o TypeORM, pero el desarrollo demanda su instalación en cada servicio.

* RDS
Esta infrastructura incluye una función Lambda que ejecuta sentencias SQL de scaffolding. Esto es solamente para alivianar las instrucciones de despliegue de este challenge.

Por otra parte, elegí la autenticación por password por sobre la alternativa de roles IAM debido a ciertos quirks de TypeORM. Idealmente, el acceso desde las funciones Lambda a la instancia de RDS es manejable desde la configuración iam de un archivo serverless.yaml.

# INSTRUCCIONES

```
cd infra
cdk bootstrap

cd ..

./deploy.sh
```

Endpoints:
* GET /api/inventory
* POST /api/inventory/create

Ejemplo de uso:
```
curl -H 'Content-Type: application/json' -d '{"name": "test", "info": {"category":"test"}}' -X POST https://1234.execute-api.sa-east-1.amazonaws.com/inventory/productVariation/create
```

# SOLUCIÓN PROPUESTA

![Graph](https://github.com/LucaPetro/infra-challenge/blob/main/images-doc/Graph.drawio.png)

Mi solución divide el monolito en cinco contextos separados:
* Inventario
* Perfiles
* Catálogo
* Compras
* Auth

El mayor problema organizacional del monolito original es la polisemia del término "usuario": el contexto de *comprador* y *vendedor* están solapados. Incluso dentro de un monolito, es apropiado separar la función de autenticación del usuario de la información comercial del vendedor y las preferencias del comprador.

Mi refactorización se centra en hacer esta distinción. El contexto de inventario se encarga de las operaciones desde el punto de vista del vendedor, y controla la fuente de la verdad de la arquitectura: una instancia RDS \(idealmente PostgreSQL\).

Por otra parte, el contexto de catálogo hace consultas para el frontend comercial sobre una instancia de DynamoDB. Esta es una implementación del patrón CQRS: las operaciones desde el punto de vista del vendedor son mayoritariamente de escritura, mientras que las operaciones para el comprador son mayoritariamente de lectura.

Las operaciones CRUD desde el contexto de inventario generan eventos capturados por EventBridge, conteniendo la totalidad del documento para las operaciones CRU. Estos eventos son recibidos y persistidos por el contexto de catálogo para mantener ambas bases de datos en sincronía, idealmente usando operaciones upsert para reducir costes de tiempo y simplificar el escalado. Como fallback, EventBridge Scheduler ejecuta trabajos de sincronía periódicos cada 24hs.

El contexto de inventario también se encarga parcialmente de la carga de imágenes. La función "Presign URL" es llamada por el frontend de inventario para reservar una URL de S3 para la carga de imágenes de producto. Cada carga a S3 emite un evento, capturado por SQS y enviado a "Update Image URL", que actualiza la columna de URL del producto asociado en RDS.

Para realizar una compra, el contexto de catálogo emite un evento a SQS, que es enviado al inicio de un workflow de Step Functions (el contexto de compras). Este servicio se encarga de procesar los pasos de una compra: verificar el stock, reservarlo, mediar el pago, y persistir el registro. Las operaciones del contexto de compra que conciernen la base de datos de inventario se realizan por medio de eventos por SQS, conectando con funciones del contexto de inventario.

Las utilidades de Step Functions simplifican la reversión del proceso de compras en el evento de una cancelación, o un mismatch de stock causado por desincronía de bases de datos.

Por otra parte, el contexto de perfiles y autenticación mantienen unificado el guardado de metadatos de usuario y la validación de identidad, respectivamente. Ambos contextos escalan muy pobremente en un monolito, y AWS proporciona servicios que descargan el coste de mantenimiento y desarrollo de soluciones in-house: aunque por debajo AWS Cogito emite JWTs, es una implementación stateless y serverless más apta para la escalabilidad. Por otra parte, es apto usar una instancia de DynamoDB para el guardado de información de perfiles, dado que es una funcionalidad "read-heavy", donde las escrituras son comparativamente raras.

## Alternativas

Varios de estos servicios son costosos (Cognito puede costar varios miles de dólares al mes), pero esta arquitectura no necesariamente depende de ellos.

Por el precio comparativamente menor de mantener un clúster de EKS, se puede reemplazar Cognito por un despliegue de [Zitadel](https://zitadel.com/), y SQS/SNS/EventBridge son emulables manteniendo una instancia de [NATS](https://nats.io/) y/o [Kestra](https://kestra.io/). 

NATS y Kestra son extremadamente fáciles de desplegar (aunque tienen un coste de desarrollo y mantenimiento), y Kestra específicamente escala muy bien. Aunque NATS no tiene las funciones de fan-out de los servicios de Amazon, es posible emularlas mediante consumidores de NATS JetStream.

Por otra parte, el stack de Grafana es una solución de observabilidad mucho más robusta que CloudWatch. El servicio Cloud es fácilmente integrable con Amazon, y es más flexible y configurable (especialmente las dashboards, hay varias premade para servicios de HTTP que simplifican mucho el monitoreo de métricas).

El coste de instrumentación de Grafana es bajo, incluso para despliegues on-premise. La emisión de traces en el contexto de una aplicación HTTP generalmente se instrumenta por librerías, y usando Grafana Tempo estas pueden generar métricas, eliminando la mayoría del overhead de desarrollo de la observabilidad en APIs.

# ARQUITECTURA

Visto que la aplicación base es NestJS, opté por una alternativa intermedia entre monolito y microservicio. NestJS es un framework mucho más preparado para estructurar monolitos, y eso se refleja en sus tiempos de startup: las benchmarks oficiales de la [documentación](https://docs.nestjs.com/microservices/basics#getting-started) de este caso de uso muestran una diferencia enorme entre una aplicación de Express y una de Nest, y aunque existen mitigaciones, el upside de usar Nest en microservicios es muy pequeño.

Otra ventaja de esta arquitectura es que, al ser monorepo, permite una migración por etapas. Una etapa inicial de despliegue a Lambda podría ser más cerca a un monolito, con un handler que cargue módulos particulares por variables de entorno: e.j. la función handler leería la variable MODULE_TYPE=inventory, y carga los módulos de inventario. Esta arquitectura permite conseguir las ventajas del escalado horizontal con una única aplicación y pipeline de despliegue, pero desperdicia espacio y aumenta los tiempos de warmup.

Además, esta opción trae la ventaja sustancial de no forzar "pasos largos" de migración, como cambios de esquema, siendo más amigable para el desarrollo entre equipos.
