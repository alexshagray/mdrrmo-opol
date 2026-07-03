<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('first_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('last_name', 100);
            $table->string('phone_number', 20)->unique();
            $table->string('email', 150)->nullable()->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password')->nullable();
            $table->enum('role', ['resident', 'admin', 'staff1', 'staff2', 'responder'])->default('resident');
            $table->boolean('approved')->default(false);
         
            $table->string('address')->nullable();
            $table->enum('civil_status', ['Single', 'Married', 'Widowed', 'Child', 'Separated'])->nullable();
            $table->integer('age')->nullable();
            $table->enum('gender', ['Male', 'Female', 'Other', 'Prefer Not to Say'])->nullable();
            $table->boolean('gps_enabled')->default(false);
            
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();
            
            $table->index('phone_number');
            $table->index('email');
            $table->index('role');
            $table->index('approved');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
