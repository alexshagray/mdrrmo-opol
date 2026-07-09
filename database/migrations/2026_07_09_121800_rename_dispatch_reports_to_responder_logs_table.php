<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Rename the table
        Schema::rename('dispatch_reports', 'responder_logs');

        // 2. Change the status column type
        Schema::table('responder_logs', function (Blueprint $table) {
            // Drop old string column
            $table->dropColumn('status_note');
        });

        Schema::table('responder_logs', function (Blueprint $table) {
            // Add new enum column
            $table->enum('status', ['Assigned', 'Dispatched', 'En route', 'Arrived at scene', 'Rejected'])->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reverse operations in reverse order
        Schema::table('responder_logs', function (Blueprint $table) {
            $table->dropColumn('status');
        });

        Schema::table('responder_logs', function (Blueprint $table) {
            $table->string('status_note')->nullable();
        });

        Schema::rename('responder_logs', 'dispatch_reports');
    }
};
