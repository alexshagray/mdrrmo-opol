<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\PostEventController;
use App\Http\Controllers\SystemNotificationController;
use App\Http\Controllers\TwilioCallController;
use App\Http\Controllers\PatientCareReportController;
use App\Http\Controllers\IncidentReportController;
use App\Http\Controllers\TrainedPersonnelController;
use App\Http\Controllers\ResponderController;
use App\Http\Controllers\ResidentController;
use App\Http\Controllers\EmergencyTypeController;

Route::get('/emergency_types', [EmergencyTypeController::class, 'index']);

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
Route::get('/patient_care_reports', [PatientCareReportController::class, 'index']);
Route::delete('/patient_care_reports/{id}', [PatientCareReportController::class, 'destroy']);
Route::put('/patient_care_reports/{id}', [PatientCareReportController::class, 'update']);

Route::get('/incidents', [IncidentReportController::class, 'index']);
Route::get('/map/incidents', [IncidentReportController::class, 'mapIncidents']);
Route::delete('/incident_reports', [IncidentReportController::class, 'destroyAll']);
Route::delete('/incident_reports/{id}', [IncidentReportController::class, 'destroy']);
Route::put('/incident_reports/{id}/caller', [IncidentReportController::class, 'updateCallerName']);

Route::get('/dispatch_reports', [App\Http\Controllers\DispatchReportController::class, 'index']);

// Public Routes for Mobile App (PCR submission)
Route::post('/patient_care_reports', [PatientCareReportController::class, 'store']);

// Authenticated Routes (Requires Bearer Token)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/user/update', [AuthController::class, 'updateProfile']);
    Route::post('/logout', [AuthController::class, 'logout']);
    
    // Admin Management Routes
    Route::get('/admin/users', [AdminController::class, 'users']);
    Route::post('/admin/users/{id}/approve', [AdminController::class, 'approve']);
    Route::delete('/admin/users/{id}', [AdminController::class, 'reject']);
    
    Route::get('/residents/search', [ResidentController::class, 'search']);
    
    // Incident dispatches and patient reports (secured under auth)
    Route::post('/incident_reports', [IncidentReportController::class, 'store']);
    Route::post('/dispatch_reports', [App\Http\Controllers\DispatchReportController::class, 'store']);
});

// Responder List
Route::get('/responders', [ResponderController::class, 'index']);

// Staff 1 Inventory Routes
Route::get('inventory/transactions', [InventoryController::class, 'transactions']);
Route::post('inventory/{id}/stock-in', [InventoryController::class, 'stockIn']);
Route::post('inventory/{id}/distribute', [InventoryController::class, 'distribute']);
Route::apiResource('inventory', InventoryController::class);

// Post Events & Notifications
Route::apiResource('post_events', PostEventController::class);
Route::get('/notifications', [SystemNotificationController::class, 'index']);
Route::post('/notifications', [SystemNotificationController::class, 'store']);


// Trained Personnel CRUD
Route::apiResource('trained_personnels', TrainedPersonnelController::class)->except(['create', 'edit', 'show']);
