<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Drop foreign key constraint on incident_locations
        Schema::table('incident_locations', function (Blueprint $table) {
            $table->dropForeign(['incident_report_id']);
        });

        // 2. Rename the main table
        Schema::rename('incident_reports', 'incident_details');

        // 3. Rename the column in incident_locations and add the new foreign key
        Schema::table('incident_locations', function (Blueprint $table) {
            $table->renameColumn('incident_report_id', 'incident_detail_id');
        });

        Schema::table('incident_locations', function (Blueprint $table) {
            $table->foreign('incident_detail_id')->references('id')->on('incident_details')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('incident_locations', function (Blueprint $table) {
            $table->dropForeign(['incident_detail_id']);
        });

        Schema::rename('incident_details', 'incident_reports');

        Schema::table('incident_locations', function (Blueprint $table) {
            $table->renameColumn('incident_detail_id', 'incident_report_id');
        });

        Schema::table('incident_locations', function (Blueprint $table) {
            $table->foreign('incident_report_id')->references('id')->on('incident_reports')->onDelete('cascade');
        });
    }
};
