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
        Schema::table('patient_care_records', function (Blueprint $table) {
            $table->dropColumn('incident_id');
            $table->foreignId('incident_detail_id')->nullable()->constrained('incident_details')->onDelete('cascade');
        });

        Schema::table('responder_logs', function (Blueprint $table) {
            $table->dropColumn('incident_id');
            $table->foreignId('incident_detail_id')->nullable()->constrained('incident_details')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('responder_logs', function (Blueprint $table) {
            $table->dropForeign(['incident_detail_id']);
            $table->dropColumn('incident_detail_id');
            $table->string('incident_id')->nullable();
        });

        Schema::table('patient_care_records', function (Blueprint $table) {
            $table->dropForeign(['incident_detail_id']);
            $table->dropColumn('incident_detail_id');
            $table->string('incident_id', 50)->unique()->nullable();
        });
    }
};
