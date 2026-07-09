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
        Schema::table('emergency_types', function (Blueprint $table) {
            $table->renameColumn('name', 'emergency_name');
            $table->string('description', 255)->nullable()->change();
            $table->dropColumn(['color_hex', 'emoji_icon', 'severity_level']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('emergency_types', function (Blueprint $table) {
            $table->renameColumn('emergency_name', 'name');
            $table->text('description')->nullable()->change();
            $table->string('color_hex', 7);
            $table->string('emoji_icon', 10);
            $table->enum('severity_level', ['Low', 'Medium', 'High', 'Critical']);
        });
    }
};
