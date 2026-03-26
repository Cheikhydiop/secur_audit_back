// Enums corrigés selon le schéma Prisma
export enum UserRole {
  ADMIN = 'ADMIN',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  SUPERVISOR = 'SUPERVISOR',
  TECHNICIAN = 'TECHNICIAN',
  CONTRACTOR = 'CONTRACTOR',
  CLIENT = 'CLIENT',
  GOVERNMENT = 'GOVERNMENT',
  CALL_CENTER = 'CALL_CENTER',
  AUDITOR = 'AUDITOR',
  CITIZEN = 'CITIZEN'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING'
}

export enum ProjectStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum TaskStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum RequestType {
  CONNECTION = 'CONNECTION',
  INCIDENT = 'INCIDENT',
  AUDIT = 'AUDIT',
  INSPECTION = 'INSPECTION',
  MAINTENANCE = 'MAINTENANCE',
  OTHER = 'OTHER'
}

export enum RequestStatus {
  SUBMITTED = 'SUBMITTED',
  ANALYZING = 'ANALYZING',
  VALIDATED = 'VALIDATED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum RequestChannel {
  APP = 'APP',
  WEBSITE = 'WEBSITE',
  API = 'API',
  CALL_CENTER = 'CALL_CENTER',
  FIELD_AGENT = 'FIELD_AGENT'
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum EquipmentStatus {
  AVAILABLE = 'AVAILABLE',
  IN_USE = 'IN_USE',
  MAINTENANCE = 'MAINTENANCE',
  REPAIR = 'REPAIR',
  DEFECTIVE = 'DEFECTIVE',
  LOST = 'LOST',
  RETIRED = 'RETIRED',
  RESERVED = 'RESERVED'
}

export enum EquipmentCondition {
  NEW = 'NEW',
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  DAMAGED = 'DAMAGED'
}

export enum EquipmentCategory {
  ELECTRICAL = 'ELECTRICAL',
  ELECTRONIC = 'ELECTRONIC',
  MECHANICAL = 'MECHANICAL',
  IT = 'IT',
  SAFETY = 'SAFETY',
  MEASUREMENT = 'MEASUREMENT',
  CONSTRUCTION = 'CONSTRUCTION',
  VEHICLE = 'VEHICLE',
  POWER = 'POWER',
  OFFICE = 'OFFICE',
  OTHER = 'OTHER'
}

export enum InventoryItemStatus {
  IN_STOCK = 'IN_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  DISCONTINUED = 'DISCONTINUED',
  ON_ORDER = 'ON_ORDER',
  RESERVED = 'RESERVED'
}

export enum InventoryTransactionType {
  RECEIPT = 'RECEIPT',
  ISSUE = 'ISSUE',
  TRANSFER = 'TRANSFER',
  RETURN = 'RETURN',
  ADJUSTMENT = 'ADJUSTMENT',
  COUNT = 'COUNT',
  WRITE_OFF = 'WRITE_OFF'
}

export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
  INSPECTION = 'INSPECTION',
  CALIBRATION = 'CALIBRATION',
  UPGRADE = 'UPGRADE',
  OTHER = 'OTHER'
}

export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  PENDING_PARTS = 'PENDING_PARTS',
  DELAYED = 'DELAYED'
}

export enum ProviderType {
  ENTERPRISE = 'ENTERPRISE',
  SMALL_BUSINESS = 'SMALL_BUSINESS',
  FREELANCE = 'FREELANCE',
  COOPERATIVE = 'COOPERATIVE',
  NGO = 'NGO',
  GOVERNMENT = 'GOVERNMENT',
  OTHER = 'OTHER'
}

export enum ProviderStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  SUSPENDED = 'SUSPENDED',
  BLACKLISTED = 'BLACKLISTED'
}

export enum ContractStatus {
  DRAFT = 'DRAFT',
  PENDING_SIGNATURE = 'PENDING_SIGNATURE',
  SIGNED = 'SIGNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  TERMINATED = 'TERMINATED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}
export interface Location {
  id: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  description?: string;
  createdAt?: Date; // Ajoutez cette ligne si nécessaire
  updatedAt?: Date; // Ajoutez cette ligne si nécessaire
}

export enum DocumentCategory {
  CONTRACT = 'CONTRACT',
  REPORT = 'REPORT',
  PHOTO = 'PHOTO',
  NOTE = 'NOTE',
  INVOICE = 'INVOICE',
  CERTIFICATE = 'CERTIFICATE',
  REGULATORY = 'REGULATORY',
  OTHER = 'OTHER'
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED'
}

export enum NotificationType {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ALERT = 'ALERT',
  SUCCESS = 'SUCCESS',
  TASK_ASSIGNMENT = 'TASK_ASSIGNMENT',
  REQUEST_UPDATE = 'REQUEST_UPDATE',
  DOCUMENT_UPDATE = 'DOCUMENT_UPDATE',
  DEADLINE = 'DEADLINE',
  SYSTEM = 'SYSTEM'
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum CertificationStatus {
  VALID = 'VALID',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED'
}

export enum SignatureStatus {
  PENDING = 'PENDING',
  SIGNED = 'SIGNED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

export enum FormFieldType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  TIME = 'TIME',
  DATETIME = 'DATETIME',
  SELECT = 'SELECT',
  MULTISELECT = 'MULTISELECT',
  CHECKBOX = 'CHECKBOX',
  RADIO = 'RADIO',
  FILE = 'FILE',
  IMAGE = 'IMAGE',
  LOCATION = 'LOCATION',
  SIGNATURE = 'SIGNATURE',
  BARCODE = 'BARCODE',
  QRCODE = 'QRCODE'
}

export enum FormTemplateStatus {
  ACTIVE = 'ACTIVE',
  DRAFT = 'DRAFT',
  ARCHIVED = 'ARCHIVED'
}

export enum KPIPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY'
}

export enum KPITrend {
  UP = 'UP',
  DOWN = 'DOWN',
  STABLE = 'STABLE'
}

// Interfaces corrigées
export interface Location {
  id: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  description?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
password: string;

  role: UserRole;
  status: UserStatus;
  avatar?: string;
  organization?: string;
  phoneNumber?: string;
  jobTitle?: string;
  department?: string;
  createdAt: Date;
  lastLogin?: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  objective: string;
  scope: string;
  geographicalArea: string;
  client: string;
  startDate: Date;
  endDate: Date;
  status: ProjectStatus;
  budget?: number;
  progress: number;
  contract?: string;
  funder?: string;
  governmentEntity?: string;
  riskLevel?: RiskLevel;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  projectManagerId: string;
  projectManager: User;
  supervisors: User[];
  contractors: Contractor[];
  parentProjectId?: string;
  parentProject?: Project;
  subProjects: Project[];
  tasks: Task[];
  documents: Document[];
  requests: Request[];
  kpis: KPI[];
  timeline: TimelinePoint[];
  budgetDistribution: BudgetItem[];
  locationId?: string;
  location?: Location;
  contracts: Contract[];
  evaluations: Evaluation[];
}

export interface TimelinePoint {
  id: string;
  date: Date;
  planned: number;
  actual?: number;
  projectId: string;
  project: Project;
}

export interface BudgetItem {
  id: string;
  category: string;
  amount: number;
  percentage: number;
  projectId: string;
  project: Project;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: Date;
  completedAt?: Date;
  formTemplate?: string;
  formData?: any; // Json
  dependencies: string[];
  createdAt: Date;
  
  // Relations
  assignedToId?: string;
  assignedTo?: User;
  projectId?: string;
  project?: Project;
  requestId?: string;
  request?: Request;
  locationId?: string;
  location?: Location;
  checklist: ChecklistItem[];
  equipmentRequired: EquipmentReference[];
  attachments: Attachment[];
  comments: Comment[];
}

export interface ChecklistItem {
  id: string;
  description: string;
  completed: boolean;
  required: boolean;
  taskId: string;
  task: Task;
}

export interface EquipmentReference {
  id: string;
  name: string;
  type: string;
  status: EquipmentStatus;
  taskId: string;
  task: Task;
}

export interface Request {
  id: string;
  title: string;
  description: string;
  type: RequestType;
  priority: Priority;
  status: RequestStatus;
  dueDate?: Date;
  channel: RequestChannel;
  createdAt: Date;
  
  // Relations
  createdById: string;
  createdBy: User;
  assignedToId?: string;
  assignedTo?: User;
  projectId?: string;
  project?: Project;
  subProject?: string;
  site?: string;
  contract?: string;
  locationId?: string;
  location?: Location;
  tasks: Task[];
  comments: Comment[];
  attachments: Attachment[];
}

export interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  createdById: string;
  createdBy: User;
  requestId?: string;
  request?: Request;
  taskId?: string;
  task?: Task;
  attachments: Attachment[];
}

export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  description?: string;
  uploadedAt: Date;
  
  // Relations
  uploadedById: string;
  uploadedBy: User;
  requestId?: string;
  request?: Request;
  taskId?: string;
  task?: Task;
  commentId?: string;
  comment?: Comment;
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  model: string;
  serialNumber: string;
  manufacturer: string;
  purchaseDate: Date;
  purchasePrice: number;
  currency: string;
  warrantyExpirationDate?: Date;
  status: EquipmentStatus;
  condition: EquipmentCondition;
  description?: string;
  specifications?: any; // Json
  category: EquipmentCategory;
  tags: string[];
  lastMaintenance?: Date;
  nextMaintenance?: Date;
  code?: string;
  imageUrl?: string;
  notes?: string;
  barcode?: string;
  qrCode?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Embedded
  attachedToType?: string;
  attachedToId?: string;
  
  // Relations
  assignedToId?: string;
  assignedTo?: User;
  locationId?: string;
  location?: Location;
  maintenanceHistory: MaintenanceRecord[];
  documents: Document[];
}

export interface InventoryItem {
  id: string;
  name: string;
  SKU: string;
  category: string;
  description?: string;
  quantity: number;
  unit: string;
  minimumStock?: number;
  purchasePrice?: number;
  currency?: string;
  purchaseDate?: Date;
  expiryDate?: Date;
  specifications?: any; // Json
  tags: string[];
  status: InventoryItemStatus;
  attachedTo?: string;
  imageUrl?: string;
  barcode?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  locationId?: string;
  location?: Location;
  supplierId?: string;
  supplier?: Provider;
  transactions: InventoryTransaction[];
  maintenanceRecords: MaintenanceRecord[];
}

export interface InventoryTransaction {
  id: string;
  transactionType: InventoryTransactionType;
  quantity: number;
  date: Date;
  reason?: string;
  project?: string;
  task?: string;
  notes?: string;
  createdAt: Date;
  
  // Relations
  itemId: string;
  item: InventoryItem;
  userId: string;
  user: User;
  fromLocationId?: string;
  fromLocation?: Location;
  toLocationId?: string;
  toLocation?: Location;
  documents: Document[];
}

export interface MaintenanceRecord {
  id: string;
  maintenanceType: MaintenanceType;
  date: Date;
  description: string;
  cost?: number;
  currency?: string;
  status: MaintenanceStatus;
  notes?: string;
  scheduledDate?: Date;
  completedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  equipmentId: string;
  equipment: Equipment;
  technicianId: string;
  technician: User;
  createdById: string;
  createdBy: User;
  parts: InventoryItem[];
  documents: Document[];
}

export interface Provider {
  id: string;
  name: string;
  companyType: ProviderType;
  registrationNumber: string;
  taxId?: string;
  foundedDate?: Date;
  contactPerson: string;
  email: string;
  phoneNumber: string;
  website?: string;
  specializations: string[];
  services: string[];
  description?: string;
  logo?: string;
  rating?: number;
  status: ProviderStatus;
  paymentTerms?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Embedded address
  street: string;
  city: string;
  postalCode: string;
  country: string;
  
  // Embedded bank information
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  swiftCode?: string;
  iban?: string;
  
  // Relations
  contracts: Contract[];
  certifications: Certification[];
  documents: Document[];
  evaluations: Evaluation[];
  inventoryItems: InventoryItem[];
}

export interface Contractor {
  id: string;
  name: string;
  companyType: ProviderType;
  registrationNumber: string;
  taxId?: string;
  foundedDate?: Date;
  contactPerson: string;
  email: string;
  phoneNumber: string;
  address: string;
  website?: string;
  specialization: string;
  services: string[];
  description?: string;
  logo?: string;
  rating?: number;
  status: ProviderStatus;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  projects: Project[];
}

export interface Contract {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  value: number;
  currency: string;
  paymentTerms: string;
  status: ContractStatus;
  signedAt?: Date;
  terminatedAt?: Date;
  terminationReason?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  providerId: string;
  provider: Provider;
  projectId?: string;
  project?: Project;
  signedById?: string;
  signedBy?: User;
  documents: Document[];
  amendments: ContractAmendment[];
}

export interface ContractAmendment {
  id: string;
  title: string;
  description: string;
  changes: string;
  reason: string;
  effectiveDate: Date;
  signedAt?: Date;
  status: ContractStatus;
  createdAt: Date;
  
  // Relations
  contractId: string;
  contract: Contract;
  signedById?: string;
  signedBy?: User;
  documents: Document[];
}

export interface Certification {
  id: string;
  name: string;
  issuingAuthority: string;
  issuedDate: Date;
  expiryDate?: Date;
  documentId?: string;
  status: CertificationStatus;
  verificationUrl?: string;
  
  // Relations
  providerId: string;
  provider: Provider;
}

export interface Evaluation {
  id: string;
  date: Date;
  overallRating: number;
  comments?: string;
  recommendations?: string;
  
  // Relations
  providerId: string;
  provider: Provider;
  evaluatorId: string;
  evaluator: User;
  projectId?: string;
  project?: Project;
  criteria: EvaluationCriteria[];
}

export interface EvaluationCriteria {
  id: string;
  name: string;
  description?: string;
  rating: number;
  weight: number;
  comments?: string;
  
  // Relations
  evaluationId: string;
  evaluation: Evaluation;
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: DocumentCategory;
  tags: string[];
  version: string;
  status: DocumentStatus;
  uploadedAt: Date;
  updatedAt: Date;
  
  // Embedded
  relatedToType?: string;
  relatedToId?: string;
  
  // Relations
  uploadedById: string;
  uploadedBy: User;
  projectId?: string;
  project?: Project;
  contractId?: string;
  contract?: Contract;
  contractAmendmentId?: string;
  contractAmendment?: ContractAmendment;
  providerId?: string;
  provider?: Provider;
  equipmentId?: string;
  equipment?: Equipment;
  maintenanceRecordId?: string;
  maintenanceRecord?: MaintenanceRecord;
  inventoryTransactionId?: string;
  inventoryTransaction?: InventoryTransaction;
  signatures: Signature[];
}

export interface Signature {
  id: string;
  signedAt: Date;
  validUntil?: Date;
  certificate?: string;
  status: SignatureStatus;
  
  // Relations
  signedById: string;
  signedBy: User;
  documentId: string;
  document: Document;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: Priority;
  read: boolean;
  recipient: string;
  createdAt: Date;
  
  // Embedded
  relatedToType?: string;
  relatedToId?: string;
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  status: FormTemplateStatus;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  createdById: string;
  createdBy: User;
  fields: FormField[];
}

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options: string[];
  placeholder?: string;
  helpText?: string;
  validation?: string;
  
  // Embedded conditional
  dependsOn?: string;
  showIf?: any; // Json
  
  // Relations
  templateId: string;
  template: FormTemplate;
}

export interface KPI {
  id: string;
  name: string;
  description: string;
  value: number;
  target: number;
  unit: string;
  trend: KPITrend;
  category: string;
  period: KPIPeriod;
  date: Date;
  
  // Embedded
  relatedToType?: string;
  relatedToId?: string;
  
  // Relations
  projectId?: string;
  project?: Project;
}

// Dashboard interface (inchangée car elle ne correspond pas directement au schéma)
export interface Dashboard {
  projectsCount: {
    total: number;
    inProgress: number;
    completed: number;
    delayed: number;
  };
  tasksCount: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    delayed: number;
  };
  requestsCount: {
    total: number;
    new: number;
    inProgress: number;
    completed: number;
  };
  projectsByStatus: {
    status: string;
    count: number;
    percentage: number;
  }[];
  tasksByPriority: {
    priority: string;
    count: number;
    trend: string;
    completion: number;
    overdue: number;
  }[];
  tasksByStatus: {
    status: string;
    count: number;
    trend: string;
    completion: number;
    overdue: number;
  }[];
  recentTasks: Task[];
  recentRequests: Request[];
}