<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            $table->string('call_id')->nullable()->after('incident_id');
            $table->enum('caller_type', ['Resident', 'Visitor'])->nullable()->after('emergency_type');
        });
    }

    public function down(): void
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            $table->dropColumn([
                'call_id',
                'caller_type'
            ]);
        });
    }
};
