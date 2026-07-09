<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::dropIfExists('incident_reports');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::create('incident_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('generated_by')->constrained('users')->onDelete('cascade');
            $table->string('file_name');
            $table->string('file_path');
            $table->string('file_type', 10);
            $table->timestamp('date_range_start')->nullable();
            $table->timestamp('date_range_end')->nullable();
            $table->timestamps();
        });
    }
};
