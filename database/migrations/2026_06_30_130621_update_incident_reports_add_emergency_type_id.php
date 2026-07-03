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
        Schema::table('incident_reports', function (Blueprint $table) {
            $table->dropColumn('emergency_type');
            $table->foreignId('emergency_type_id')->nullable()->after('incident_id')->constrained('emergency_types')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            $table->dropForeign(['emergency_type_id']);
            $table->dropColumn('emergency_type_id');
            $table->string('emergency_type')->nullable()->after('incident_id');
        });
    }
};
