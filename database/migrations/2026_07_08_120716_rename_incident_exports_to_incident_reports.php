<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('incident_exports', 'incident_reports');
    }

    public function down(): void
    {
        Schema::rename('incident_reports', 'incident_exports');
    }
};
