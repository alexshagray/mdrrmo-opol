<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incident_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('incident_report_id')->constrained('incident_reports')->onDelete('cascade');
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->string('location')->nullable();
            $table->string('barangay')->nullable();
            $table->string('purok')->nullable();
            $table->string('landmark')->nullable();
            $table->timestamps();
            
            $table->index('incident_report_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incident_locations');
    }
};
