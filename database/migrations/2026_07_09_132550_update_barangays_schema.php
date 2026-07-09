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
        Schema::table('barangays', function (Blueprint $table) {
            $table->renameColumn('name', 'barangay_name');
            $table->string('barangay_name', 150)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('barangays', function (Blueprint $table) {
            $table->string('barangay_name', 255)->change();
            $table->renameColumn('barangay_name', 'name');
        });
    }
};
