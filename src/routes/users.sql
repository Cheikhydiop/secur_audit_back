users
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
name
TEXT
NOT NULL
email
TEXT
NOT NULL
password
TEXT
NOT NULL
role
UserRole
NOT NULL
status
UserStatus
NOT NULL
DEFAULT'ACTIVE'::"UserStatus"
avatar
TEXT
organization
TEXT
phoneNumber
TEXT
jobTitle
TEXT
department
TEXT
createdAt
TIMESTAMP
NOT NULL
DEFAULTCURRENT_TIMESTAMP
lastLogin
TIMESTAMP
updatedAt
TIMESTAMP
NOT NULL
Constraints
Add constraint
CONSTRAINT
users_pkey
PRIMARY KEY
(id)
Indexes
Add index
UNIQUE
INDEX
users_pkey
…
USING
BTREE
(id)
UNIQUE
INDEX
users_email_key
…
USING
BTREE
(email)


timeline_points
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
date
TIMESTAMP
NOT NULL
planned
DOUBLE PRECISION
NOT NULL
actual
DOUBLE PRECISION
projectId
TEXT
NOT NULL
Constraints
Add constraint
CONSTRAINT
timeline_points_pkey
PRIMARY KEY
(id)
CONSTRAINT
timeline_points_projectId_fkey
FOREIGN KEY
(projectId)
REFERENCES
public.projects
(id)
ON UPDATECASCADE
ON DELETECASCADE
Indexes
Add index

tasks
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
title
TEXT
NOT NULL
description
TEXT
NOT NULL
status
TaskStatus
NOT NULL
priority
Priority
NOT NULL
dueDate
TIMESTAMP
NOT NULL
completedAt
TIMESTAMP
formTemplate
TEXT

formData
JSONB
dependencies
TEXT[]
createdAt
TIMESTAMP
NOT NULL
DEFAULTCURRENT_TIMESTAMP
assignedToId
TEXT
projectId
TEXT
requestId
TEXT
locationId
TEXT
Constraints
Add constraint
CONSTRAINT
tasks_pkey
PRIMARY KEY
(id)
CONSTRAINT
tasks_locationId_fkey
FOREIGN KEY
(locationId)
REFERENCES
public.locations
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
tasks_requestId_fkey
FOREIGN KEY
(requestId)
REFERENCES
public.requests
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
tasks_projectId_fkey
FOREIGN KEY
(projectId)
REFERENCES
public.projects
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
tasks_assignedToId_fkey
FOREIGN KEY
(assignedToId)
REFERENCES
public.users
(id)
ON UPDATECASCADE
ON DELETESET NULL
Indexes
Add index

taskChecklistItems
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
taskid
TEXT
description
TEXT
NOT NULL
completed
BOOLEAN
NOT NULL
DEFAULTfalse
required
BOOLEAN
NOT NULL
DEFAULTfalse
created_at
TIMESTAMP
DEFAULTCURRENT_TIMESTAMP
Constraints
Add constraint

CONSTRAINT
taskChecklistItems_pkey
PRIMARY KEY
(id)
CONSTRAINT
taskChecklistItems_taskid_fkey
FOREIGN KEY
(taskid)
REFERENCES
public.tasks
(id)
Indexes
Add index
signatures
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
signedAt
TIMESTAMP
NOT NULL
validUntil
TIMESTAMP
certificate
TEXT
status
SignatureStatus
NOT NULL
signedById
TEXT
NOT NULL
documentId
TEXT
NOT NULL
Constraints
Add constraint

CONSTRAINT
signatures_pkey
PRIMARY KEY
(id)
CONSTRAINT
signatures_documentId_fkey
FOREIGN KEY
(documentId)
REFERENCES
public.documents
(id)
ON UPDATECASCADE
ON DELETECASCADE
CONSTRAINT
signatures_signedById_fkey
FOREIGN KEY
(signedById)
REFERENCES
public.users
(id)
ON UPDATECASCADE
ON DELETERESTRICT
Indexes
Add index
signatures
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
signedAt
TIMESTAMP
NOT NULL
validUntil
TIMESTAMP
certificate
TEXT
status
SignatureStatus
NOT NULL
signedById
TEXT
NOT NULL
documentId
TEXT
NOT NULL
Constraints
Add constraint

CONSTRAINT
signatures_pkey
PRIMARY KEY
(id)
CONSTRAINT
signatures_documentId_fkey
FOREIGN KEY
(documentId)
REFERENCES
public.documents
(id)
ON UPDATECASCADE
ON DELETECASCADE
CONSTRAINT
signatures_signedById_fkey
FOREIGN KEY
(signedById)
REFERENCES
public.users
(id)
ON UPDATECASCADE
ON DELETERESTRICT
Indexes
Add index
providers
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
name
TEXT
NOT NULL
companyType
ProviderType
NOT NULL
registrationNumber
TEXT
NOT NULL
taxId
TEXT
foundedDate
TIMESTAMP
contactPerson
TEXT
NOT NULL
email
TEXT
NOT NULL
phoneNumber
TEXT
NOT NULL
website
TEXT
specializations
TEXT[]
services
TEXT[]
description
TEXT
logo
TEXT
rating
DOUBLE PRECISION
status
ProviderStatus
NOT NULL
DEFAULT'PENDING_VERIFICATION'::"ProviderStatus"
paymentTerms
TEXT
createdAt
TIMESTAMP
NOT NULL
DEFAULTCURRENT_TIMESTAMP
updatedAt
TIMESTAMP
NOT NULL
street
TEXT
NOT NULL
city
TEXT
NOT NULL
postalCode
TEXT
NOT NULL
country
TEXT
NOT NULL
bankName
TEXT
accountNumber
TEXT
accountName
TEXT
swiftCode
TEXT
iban
TEXT
Constraints
Add constraint
CONSTRAINT
providers_pkey
PRIMARY KEY
(id)
Indexes
Add index
projecttimeline
Table name
Columns
Add column
projectid
VARCHAR
date
DATE
plannedprogress
INTEGER
NOT NULL
actualprogress
INTEGER
Constraints
Add constraint
CONSTRAINT
projecttimeline_pkey
PRIMARY KEY
(projectid, date)
Indexes
Add index
projects
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
name
TEXT
NOT NULL
description
TEXT
NOT NULL
objective
TEXT
NOT NULL
scope
TEXT
NOT NULL
geographicalArea
TEXT
NOT NULL
client
TEXT
NOT NULL
startDate
TIMESTAMP
NOT NULL
endDate
TIMESTAMP
NOT NULL
status
ProjectStatus
NOT NULL
budget
DOUBLE PRECISION
progress
DOUBLE PRECISION
NOT NULL
DEFAULT'0'
contract
TEXT
funder
TEXT
governmentEntity
TEXT
riskLevel
RiskLevel
createdAt
TIMESTAMP
NOT NULL
DEFAULTCURRENT_TIMESTAMP
updatedAt
TIMESTAMP
NOT NULL
projectManagerId
TEXT
NOT NULL
parentProjectId
TEXT
locationId
TEXT
Constraints
Add constraint
CONSTRAINT
projects_pkey
PRIMARY KEY
(id)
CONSTRAINT
projects_locationId_fkey
FOREIGN KEY
(locationId)
REFERENCES
public.locations
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
projects_parentProjectId_fkey
FOREIGN KEY
(parentProjectId)
REFERENCES
public.projects
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
projects_projectManagerId_fkey
FOREIGN KEY
(projectManagerId)
REFERENCES
public.users
(id)
ON UPDATECASCADE
ON DELETERESTRICT
Indexes
Add index
project_budget_distribution
Table name
Columns
Add column
project_id
VARCHAR
category
VARCHAR
amount
BIGINT
NOT NULL
percentage
INTEGER
NOT NULL
Constraints
Add constraint

CONSTRAINT
project_budget_distribution_pkey
PRIMARY KEY
(project_id, category)
Indexes
Add index
notifications
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
title
TEXT
NOT NULL
message
TEXT
NOT NULL
type
NotificationType
NOT NULL
priority
Priority
NOT NULL
read
BOOLEAN
NOT NULL
DEFAULTfalse
recipient
TEXT
NOT NULL
createdAt
TIMESTAMP
NOT NULL
DEFAULTCURRENT_TIMESTAMP
relatedToType
TEXT
relatedToId
TEXT
Constraints
Add constraint
CONSTRAINT
notifications_pkey
PRIMARY KEY
(id)
Indexes
Add index
maintenance_records
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
maintenanceType
MaintenanceType
NOT NULL
date
TIMESTAMP
NOT NULL
description
TEXT
NOT NULL
cost
DOUBLE PRECISION
currency
TEXT

status
MaintenanceStatus
NOT NULL
notes
TEXT
scheduledDate
TIMESTAMP
completedDate
TIMESTAMP
createdAt
TIMESTAMP
NOT NULL
DEFAULTCURRENT_TIMESTAMP
updatedAt
TIMESTAMP
NOT NULL
equipmentId
TEXT
NOT NULL
technicianId
TEXT
NOT NULL
createdById
TEXT
NOT NULL
Constraints
Add constraint
CONSTRAINT
maintenance_records_pkey
PRIMARY KEY
(id)
CONSTRAINT
maintenance_records_createdById_fkey
FOREIGN KEY
(createdById)
REFERENCES
public.users
(id)
ON UPDATECASCADE
ON DELETERESTRICT
CONSTRAINT
maintenance_records_technicianId_fkey
FOREIGN KEY
(technicianId)
REFERENCES
public.users
(id)
ON UPDATECASCADE
ON DELETERESTRICT
CONSTRAINT
maintenance_records_equipmentId_fkey
FOREIGN KEY
(equipmentId)
REFERENCES
public.equipment
(id)
ON UPDATECASCADE
ON DELETECASCADE
Indexes
Add index
locations
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
latitude
DOUBLE PRECISION
NOT NULL
longitude
DOUBLE PRECISION
NOT NULL
address
TEXT
city
TEXT
region
TEXT
country
TEXT
description
TEXT
name
TEXT
NOT NULL
Constraints
Add constraint
CONSTRAINT
locations_pkey
PRIMARY KEY
(id)
Indexes
Add index
kpis
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
name
TEXT
NOT NULL
description
TEXT
NOT NULL

value
DOUBLE PRECISION
NOT NULL
target
DOUBLE PRECISION
NOT NULL
unit
TEXT
NOT NULL
trend
KPITrend
NOT NULL
category
TEXT
NOT NULL
period
KPIPeriod
NOT NULL
date
TIMESTAMP
NOT NULL
relatedToType
TEXT
relatedToId
TEXT
projectId
TEXT
Constraints
Add constraint
CONSTRAINT
kpis_pkey
PRIMARY KEY
(id)
CONSTRAINT
kpis_projectId_fkey
FOREIGN KEY
(projectId)
REFERENCES
public.projects
(id)
ON UPDATECASCADE
ON DELETESET NULL
Indexes
Add index
inventory_transactions
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
transactionType
InventoryTransactionType
NOT NULL
quantity
INTEGER
NOT NULL
date
TIMESTAMP
NOT NULL
reason
TEXT
project
TEXT
task
TEXT
notes
TEXT
createdAt
TIMESTAMP
NOT NULL
DEFAULTCURRENT_TIMESTAMP
itemId
TEXT
NOT NULL
userId
TEXT
NOT NULL
fromLocationId
TEXT
toLocationId
TEXT
Constraints
Add constraint
CONSTRAINT
inventory_transactions_pkey
PRIMARY KEY
(id)
CONSTRAINT
inventory_transactions_toLocationId_fkey
FOREIGN KEY
(toLocationId)
REFERENCES
public.locations
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
inventory_transactions_fromLocationId_fkey
FOREIGN KEY
(fromLocationId)
REFERENCES
public.locations
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
inventory_transactions_userId_fkey
FOREIGN KEY
(userId)
REFERENCES
public.users
(id)
ON UPDATECASCADE
ON DELETERESTRICT
CONSTRAINT
inventory_transactions_itemId_fkey
FOREIGN KEY
(itemId)
REFERENCES
public.inventory_items
(id)
ON UPDATECASCADE
ON DELETECASCADE
Indexes
Add index
inventory_items
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
name
TEXT
NOT NULL
SKU
TEXT
NOT NULL
category
TEXT
NOT NULL
description
TEXT
quantity
INTEGER
NOT NULL

unit
TEXT
NOT NULL
minimumStock
INTEGER
purchasePrice
DOUBLE PRECISION
currency
TEXT
purchaseDate
TIMESTAMP
expiryDate
TIMESTAMP
specifications
JSONB
tags
TEXT[]
status
InventoryItemStatus
NOT NULL
attachedTo
TEXT
imageUrl
TEXT
barcode
TEXT
createdAt
TIMESTAMP
NOT NULL
DEFAULTCURRENT_TIMESTAMP
updatedAt
TIMESTAMP
NOT NULL
locationId
TEXT
supplierId
TEXT
Constraints
Add constraint
CONSTRAINT
inventory_items_pkey
PRIMARY KEY
(id)
CONSTRAINT
inventory_items_supplierId_fkey
FOREIGN KEY
(supplierId)
REFERENCES
public.providers
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
inventory_items_locationId_fkey
FOREIGN KEY
(locationId)
REFERENCES
public.locations
(id)
ON UPDATECASCADE
ON DELETESET NULL
Indexes
Add index
form_templates
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
name
TEXT
NOT NULL
description
TEXT
NOT NULL
category
TEXT
NOT NULL
version
TEXT
NOT NULL
status
FormTemplateStatus
NOT NULL

createdAt
TIMESTAMP
NOT NULL
DEFAULTCURRENT_TIMESTAMP
updatedAt
TIMESTAMP
NOT NULL
createdById
TEXT
NOT NULL
Constraints
Add constraint
CONSTRAINT
form_templates_pkey
PRIMARY KEY
(id)
CONSTRAINT
form_templates_createdById_fkey
FOREIGN KEY
(createdById)
REFERENCES
public.users
(id)
ON UPDATECASCADE
ON DELETERESTRICT
Indexes
Add index
form_fields
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
label
TEXT
NOT NULL
type
FormFieldType
NOT NULL
required
BOOLEAN
NOT NULL
DEFAULTfalse
options
TEXT[]
placeholder
TEXT
helpText
TEXT
validation
TEXT

dependsOn
TEXT
showIf
JSONB
templateId
TEXT
NOT NULL
Constraints
Add constraint
CONSTRAINT
form_fields_pkey
PRIMARY KEY
(id)
CONSTRAINT
form_fields_templateId_fkey
FOREIGN KEY
(templateId)
REFERENCES
public.form_templates
(id)
ON UPDATECASCADE
ON DELETECASCADE
Indexes
Add index
evaluations
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
date
TIMESTAMP
NOT NULL
overallRating
DOUBLE PRECISION
NOT NULL
comments
TEXT
recommendations
TEXT
providerId
TEXT
NOT NULL

evaluatorId
TEXT
NOT NULL
projectId
TEXT
Constraints
Add constraint
CONSTRAINT
evaluations_pkey
PRIMARY KEY
(id)
CONSTRAINT
evaluations_projectId_fkey
FOREIGN KEY
(projectId)
REFERENCES
public.projects
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
evaluations_evaluatorId_fkey
FOREIGN KEY
(evaluatorId)
REFERENCES
public.users
(id)
ON UPDATECASCADE
ON DELETERESTRICT
CONSTRAINT
evaluations_providerId_fkey
FOREIGN KEY
(providerId)
REFERENCES
public.providers
(id)
ON UPDATECASCADE
ON DELETECASCADE
Indexes
Add index
evaluation_criteria
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
name
TEXT
NOT NULL
description
TEXT
rating
DOUBLE PRECISION
NOT NULL
weight
DOUBLE PRECISION
NOT NULL
comments
TEXT

evaluationId
TEXT
NOT NULL
Constraints
Add constraint
CONSTRAINT
evaluation_criteria_pkey
PRIMARY KEY
(id)
CONSTRAINT
evaluation_criteria_evaluationId_fkey
FOREIGN KEY
(evaluationId)
REFERENCES
public.evaluations
(id)
ON UPDATECASCADE
ON DELETECASCADE
Indexes
Add index
equipment_references
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
name
TEXT
NOT NULL
type
TEXT
NOT NULL
status
EquipmentStatus
NOT NULL
taskId
TEXT
NOT NULL
Constraints
Add constraint
CONSTRAINT
equipment_references_pkey
PRIMARY KEY
(id)

CONSTRAINT
equipment_references_taskId_fkey
FOREIGN KEY
(taskId)
REFERENCES
public.tasks
(id)
ON UPDATECASCADE
ON DELETECASCADE
Indexes
Add index
equipment
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
name
TEXT
NOT NULL
type
TEXT
NOT NULL
model
TEXT
NOT NULL
serialNumber
TEXT
NOT NULL

manufacturer
TEXT
NOT NULL
purchaseDate
TIMESTAMP
NOT NULL
purchasePrice
DOUBLE PRECISION
NOT NULL
currency
TEXT
NOT NULL
warrantyExpirationDate
TIMESTAMP
status
EquipmentStatus
NOT NULL
condition
EquipmentCondition
NOT NULL
description
TEXT
specifications
JSONB
category
EquipmentCategory
NOT NULL
tags
TEXT[]
lastMaintenance
TIMESTAMP
nextMaintenance
TIMESTAMP
code
TEXT
imageUrl
TEXT
notes
TEXT
barcode
TEXT
qrCode
TEXT
createdAt
TIMESTAMP
NOT NULL
DEFAULTCURRENT_TIMESTAMP
updatedAt
TIMESTAMP
NOT NULL
attachedToType
TEXT
attachedToId
TEXT
assignedToId
TEXT
locationId
TEXT
Constraints
Add constraint
CONSTRAINT
equipment_pkey
PRIMARY KEY
(id)
CONSTRAINT
equipment_locationId_fkey
FOREIGN KEY
(locationId)
REFERENCES
public.locations
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
equipment_assignedToId_fkey
FOREIGN KEY
(assignedToId)
REFERENCES
public.users
(id)
ON UPDATECASCADE
ON DELETESET NULL
Indexes
Add index
documents
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
title
TEXT
NOT NULL
description
TEXT
fileUrl
TEXT
NOT NULL

fileType
TEXT
NOT NULL
fileSize
INTEGER
NOT NULL
category
DocumentCategory
NOT NULL
tags
TEXT[]
version
TEXT
NOT NULL
status
DocumentStatus
NOT NULL
uploadedAt
TIMESTAMP
NOT NULL
DEFAULTCURRENT_TIMESTAMP
updatedAt
TIMESTAMP
NOT NULL
relatedToType
TEXT
relatedToId
TEXT
uploadedById
TEXT
NOT NULL
projectId
TEXT
contractId
TEXT
contractAmendmentId
TEXT
providerId
TEXT
equipmentId
TEXT
maintenanceRecordId
TEXT
inventoryTransactionId
TEXT
Constraints
Add constraint
CONSTRAINT
documents_pkey
PRIMARY KEY
(id)
CONSTRAINT
documents_inventoryTransactionId_fkey
FOREIGN KEY
(inventoryTransactionId)
REFERENCES
public.inventory_transactions
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
documents_maintenanceRecordId_fkey
FOREIGN KEY
(maintenanceRecordId)
REFERENCES
public.maintenance_records
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
documents_equipmentId_fkey
FOREIGN KEY
(equipmentId)
REFERENCES
public.equipment
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
documents_providerId_fkey
FOREIGN KEY
(providerId)
REFERENCES
public.providers
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
documents_contractAmendmentId_fkey
FOREIGN KEY
(contractAmendmentId)
REFERENCES
public.contract_amendments
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
documents_contractId_fkey
FOREIGN KEY
(contractId)
REFERENCES
public.contracts
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
documents_projectId_fkey
FOREIGN KEY
(projectId)
REFERENCES
public.projects
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
documents_uploadedById_fkey
FOREIGN KEY
(uploadedById)
REFERENCES
public.users
(id)
ON UPDATECASCADE
ON DELETERESTRICT
Indexes
Add index
contracts
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
title
TEXT
NOT NULL
description
TEXT
startDate
TIMESTAMP
NOT NULL
endDate
TIMESTAMP
NOT NULL
value
DOUBLE PRECISION
NOT NULL
currency
TEXT
NOT NULL
paymentTerms
TEXT
NOT NULL

status
ContractStatus
NOT NULL
signedAt
TIMESTAMP
terminatedAt
TIMESTAMP
terminationReason
TEXT
createdAt
TIMESTAMP
NOT NULL
DEFAULTCURRENT_TIMESTAMP
updatedAt
TIMESTAMP
NOT NULL
providerId
TEXT
NOT NULL
projectId
TEXT
signedById
TEXT
Constraints
Add constraint
CONSTRAINT
contracts_pkey
PRIMARY KEY
(id)
CONSTRAINT
contracts_signedById_fkey
FOREIGN KEY
(signedById)
REFERENCES
public.users
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
contracts_projectId_fkey
FOREIGN KEY
(projectId)
REFERENCES
public.projects
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
contracts_providerId_fkey
FOREIGN KEY
(providerId)
REFERENCES
public.providers
(id)
ON UPDATECASCADE
ON DELETERESTRICT
Indexes
Add index
contractors
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
name
TEXT
NOT NULL
companyType
ProviderType
NOT NULL
registrationNumber
TEXT
NOT NULL
taxId
TEXT
foundedDate
TIMESTAMP

contactPerson
TEXT
NOT NULL
email
TEXT
NOT NULL
phoneNumber
TEXT
NOT NULL
address
TEXT
NOT NULL
website
TEXT
specialization
TEXT
NOT NULL
specializations
TEXT[]
services
TEXT[]
description
TEXT
logo
TEXT
rating
DOUBLE PRECISION
status
ProviderStatus
NOT NULL
DEFAULT'PENDING_VERIFICATION'::"ProviderStatus"
contracts
JSONB
certifications
JSONB
documents
JSONB
paymentTerms
JSONB
bankInformation
JSONB
evaluations
JSONB
createdAt
TIMESTAMP
NOT NULL
DEFAULTCURRENT_TIMESTAMP
updatedAt
TIMESTAMP
NOT NULL
DEFAULTCURRENT_TIMESTAMP
Constraints
Add constraint
CONSTRAINT
contractors_pkey
PRIMARY KEY
(id)
Indexes
Add index
contract_amendments
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
title
TEXT
NOT NULL
description
TEXT
NOT NULL
changes
TEXT
NOT NULL
reason
TEXT
NOT NULL
effectiveDate
TIMESTAMP
NOT NULL
signedAt
TIMESTAMP

status
ContractStatus
NOT NULL
createdAt
TIMESTAMP
NOT NULL
DEFAULTCURRENT_TIMESTAMP
contractId
TEXT
NOT NULL
signedById
TEXT
Constraints
Add constraint
CONSTRAINT
contract_amendments_pkey
PRIMARY KEY
(id)
CONSTRAINT
contract_amendments_signedById_fkey
FOREIGN KEY
(signedById)
REFERENCES
public.users
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
contract_amendments_contractId_fkey
FOREIGN KEY
(contractId)
REFERENCES
public.contracts
(id)
ON UPDATECASCADE
ON DELETECASCADE
Indexes
Add index
comments
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
content
TEXT
NOT NULL
createdAt
TIMESTAMP
NOT NULL
DEFAULTCURRENT_TIMESTAMP
updatedAt
TIMESTAMP
NOT NULL
createdById
TEXT
NOT NULL
requestId
TEXT
taskId
TEXT
Constraints
Add constraint
CONSTRAINT
comments_pkey
PRIMARY KEY
(id)
CONSTRAINT
comments_taskId_fkey
FOREIGN KEY
(taskId)
REFERENCES
public.tasks
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
comments_requestId_fkey
FOREIGN KEY
(requestId)
REFERENCES
public.requests
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
comments_createdById_fkey
FOREIGN KEY
(createdById)
REFERENCES
public.users
(id)
ON UPDATECASCADE
ON DELETERESTRICT
Indexes
Add index
checklist_items
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
description
TEXT
NOT NULL
completed
BOOLEAN
NOT NULL
DEFAULTfalse
required
BOOLEAN
NOT NULL
DEFAULTfalse
taskId
TEXT
NOT NULL
Constraints
Add constraint
CONSTRAINT
checklist_items_pkey
PRIMARY KEY
(id)
CONSTRAINT
checklist_items_taskId_fkey
FOREIGN KEY
(taskId)
REFERENCES
public.tasks
(id)
ON UPDATECASCADE
ON DELETECASCADE
Indexes
Add index
certifications
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
name
TEXT
NOT NULL
issuingAuthority
TEXT
NOT NULL
issuedDate
TIMESTAMP
NOT NULL
expiryDate
TIMESTAMP
documentId
TEXT
status
CertificationStatus
NOT NULL
verificationUrl
TEXT
providerId
TEXT
NOT NULL
Constraints
Add constraint
CONSTRAINT
certifications_pkey
PRIMARY KEY
(id)
CONSTRAINT
certifications_providerId_fkey
FOREIGN KEY
(providerId)
REFERENCES
public.providers
(id)
ON UPDATECASCADE
ON DELETECASCADE
Indexes
Add index
budget_items
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
category
TEXT
NOT NULL
amount
DOUBLE PRECISION
NOT NULL
percentage
DOUBLE PRECISION
NOT NULL

projectId
TEXT
NOT NULL
Constraints
Add constraint
CONSTRAINT
budget_items_pkey
PRIMARY KEY
(id)
CONSTRAINT
budget_items_projectId_fkey
FOREIGN KEY
(projectId)
REFERENCES
public.projects
(id)
ON UPDATECASCADE
ON DELETECASCADE
Indexes
Add index
attachments
Table name
Columns
Add column
id
TEXT
PRIMARY KEY
fileName
TEXT
NOT NULL
fileType
TEXT
NOT NULL

fileSize
INTEGER
NOT NULL
fileUrl
TEXT
NOT NULL
description
TEXT
uploadedAt
TIMESTAMP
NOT NULL
DEFAULTCURRENT_TIMESTAMP
uploadedById
TEXT
NOT NULL
requestId
TEXT
taskId
TEXT
commentId
TEXT
Constraints
Add constraint
CONSTRAINT
attachments_pkey
PRIMARY KEY
(id)
CONSTRAINT
attachments_commentId_fkey
FOREIGN KEY
(commentId)
REFERENCES
public.comments
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
attachments_taskId_fkey
FOREIGN KEY
(taskId)
REFERENCES
public.tasks
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
attachments_requestId_fkey
FOREIGN KEY
(requestId)
REFERENCES
public.requests
(id)
ON UPDATECASCADE
ON DELETESET NULL
CONSTRAINT
attachments_uploadedById_fkey
FOREIGN KEY
(uploadedById)
REFERENCES
public.users
(id)
ON UPDATECASCADE
ON DELETERESTRICT
Indexes
Add index
_prisma_migrations
Table name
Columns
Add column
id
VARCHAR(36)
PRIMARY KEY
checksum
VARCHAR(64)
NOT NULL
finished_at
TIMESTAMP WITH TIME ZONE
migration_name
VARCHAR(255)
NOT NULL
logs
TEXT

rolled_back_at
TIMESTAMP WITH TIME ZONE
started_at
TIMESTAMP WITH TIME ZONE
NOT NULL
DEFAULTnow()
applied_steps_count
INTEGER
NOT NULL
DEFAULT'0'
Constraints
Add constraint
CONSTRAINT
_prisma_migrations_pkey
PRIMARY KEY
(id)
Indexes
Add index
_ProjectSupervisors
Table name
Columns
Add column
A
TEXT
B
TEXT
Constraints
Add constraint
CONSTRAINT
_ProjectSupervisors_AB_pkey
PRIMARY KEY
(A, B)

CONSTRAINT
_ProjectSupervisors_B_fkey
FOREIGN KEY
(B)
REFERENCES
public.users
(id)
ON UPDATECASCADE
ON DELETECASCADE
CONSTRAINT
_ProjectSupervisors_A_fkey
FOREIGN KEY
(A)
REFERENCES
public.projects
(id)
ON UPDATECASCADE
ON DELETECASCADE
Indexes
Add index
_InventoryItemToMaintenanceRecord
Table name
Columns
Add column
A
TEXT
B
TEXT
Constraints
Add constraint
CONSTRAINT
_InventoryItemToMaintenanceRecord_AB_pkey
PRIMARY KEY
(A, B)
CONSTRAINT
_InventoryItemToMaintenanceRecord_B_fkey
FOREIGN KEY
(B)
REFERENCES
public.maintenance_records
(id)
ON UPDATECASCADE
ON DELETECASCADE
CONSTRAINT
_InventoryItemToMaintenanceRecord_A_fkey
FOREIGN KEY
(A)
REFERENCES
public.inventory_items
(id)
ON UPDATECASCADE
ON DELETECASCADE
Indexes
Add index
_ContractorToProject
Table name
Columns
Add column
A
TEXT
B
TEXT
Constraints
Add constraint
CONSTRAINT
_ContractorToProject_AB_pkey
PRIMARY KEY
(A, B)

CONSTRAINT
_ContractorToProject_B_fkey
FOREIGN KEY
(B)
REFERENCES
public.projects
(id)
ON UPDATECASCADE
ON DELETECASCADE
Indexes
Add index
