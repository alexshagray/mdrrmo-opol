<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_care_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('patient_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('incident_id', 50)->unique();
            $table->enum('status', ['draft', 'submitted', 'completed'])->default('submitted');
            $table->json('pcr_data')->nullable();
            $table->timestamp('report_date')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            $table->index('user_id');
            $table->index('patient_id');
            $table->index('incident_id');
            $table->index('status');
            $table->index('report_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_care_reports');
    }
};
