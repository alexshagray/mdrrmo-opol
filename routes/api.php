<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\PostEventController;
use App\Http\Controllers\TwilioCallController;
use App\Http\Controllers\PatientCareRecordController;
use App\Http\Controllers\IncidentDetailController;
use App\Http\Controllers\TrainedPersonnelController;
use App\Http\Controllers\ResponderController;
use App\Http\Controllers\ResidentController;
use App\Http\Controllers\EmergencyTypeController;

Route::get('/emergency_types', [EmergencyTypeController::class, 'index']);
Route::post('/emergency_types', [EmergencyTypeController::class, 'store']);
Route::get('/barangays', [App\Http\Controllers\BarangayController::class, 'index']);

use App\Models\User;

// Public Guest Routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Twilio Integrations
Route::post('/twilio/incoming', [TwilioCallController::class, 'handleIncomingCall']);
Route::post('/twilio/ivr-response', [TwilioCallController::class, 'handleIvrResponse']);
Route::post('/twilio/forward-call', [TwilioCallController::class, 'forwardCall']);
Route::get('/residents/check', [TwilioCallController::class, 'checkResident']);
Route::post('/incidents/{id}/location', [TwilioCallController::class, 'updateIncidentLocation']);

// Public Routes for Staff Dashboard (read-only access)
Route::get('/patient_care_records', [PatientCareRecordController::class, 'index']);
Route::delete('/patient_care_records/{id}', [PatientCareRecordController::class, 'destroy']);
Route::put('/patient_care_records/{id}', [PatientCareRecordController::class, 'update']);

Route::get('/incidents/export-pdf', [IncidentDetailController::class, 'exportPdf']);
Route::get('/incidents', [IncidentDetailController::class, 'index']);
Route::get('/map/incidents', [IncidentDetailController::class, 'mapIncidents']);
Route::delete('/incident_details', [IncidentDetailController::class, 'destroyAll']);
Route::delete('/incident_details/{id}', [IncidentDetailController::class, 'destroy']);
Route::put('/incident_details/{id}/caller', [IncidentDetailController::class, 'updateCallerName']);
Route::put('/incident_details/{id}/status', [IncidentDetailController::class, 'updateStatus']);
Route::put('/incident_details/{id}/location', [IncidentDetailController::class, 'updateLocation']);

Route::get('/responder_logs', [App\Http\Controllers\ResponderLogController::class, 'index']);

// Public Routes for Mobile App (PCR submission)
Route::post('/patient_care_records', [PatientCareRecordController::class, 'store']);

// Authenticated Routes (Requires Bearer Token)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/user/update', [AuthController::class, 'updateProfile']);
    Route::post('/logout', [AuthController::class, 'logout']);
    
    // Admin Management Routes
    Route::get('/admin/users', [AdminController::class, 'users']);
    Route::post('/admin/users', [AdminController::class, 'storeStaff']);
    Route::post('/admin/users/{id}/approve', [AdminController::class, 'approve']);
    Route::delete('/admin/users/{id}', [AdminController::class, 'reject']);
    
    Route::get('/residents/search', [ResidentController::class, 'search']);
    
    // Incident dispatches and patient reports (secured under auth)
    Route::post('/incident_details', [IncidentDetailController::class, 'store']);
    Route::post('/responder_logs', [App\Http\Controllers\ResponderLogController::class, 'store']);
});

// Responder List
Route::get('/responders', [ResponderController::class, 'index']);

// Staff 1 Inventory Routes
Route::get('inventory/transactions', [InventoryController::class, 'transactions']);
Route::get('inventory/remarks-suggestions', [InventoryController::class, 'remarksSuggestions']);
Route::post('inventory/{id}/stock-in', [InventoryController::class, 'stockIn']);
Route::post('inventory/{id}/distribute', [InventoryController::class, 'distribute']);
Route::post('inventory/{id}/restore', [InventoryController::class, 'restore']);
Route::post('inventory/bulk-upload', [InventoryController::class, 'bulkUpload']);
Route::apiResource('inventory', InventoryController::class);

use App\Http\Controllers\NotificationController;
Route::get('/notifications', [NotificationController::class, 'index']);

use App\Http\Controllers\ReportController;
Route::get('/reports', [ReportController::class, 'index']);
Route::post('/reports/upload', [ReportController::class, 'store']);

// Post Events & Notifications
Route::apiResource('post_events', PostEventController::class);


// Trained Personnel CRUD
Route::apiResource('trained_personnels', TrainedPersonnelController::class)->except(['create', 'edit', 'show']);
