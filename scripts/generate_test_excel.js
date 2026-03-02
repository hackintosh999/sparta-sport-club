import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ESM dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test Data
const data = [
    // Group "Champions League" (Elite, 12-14 years)
    { 'Группа': 'CHAMPIONS_LEAGUE', 'Тренер': 'Coach Victor', 'ФИО': 'Артем Дзюба', 'Возраст': 12, 'Telefon': '+79998887711', 'Родитель': 'Сергей Дзюба' },
    { 'Группа': 'CHAMPIONS_LEAGUE', 'Тренер': 'Coach Victor', 'ФИО': 'Игорь Акинфеев', 'Возраст': 13, 'Telefon': '+79998887722', 'Родитель': 'Владимир Акинфеев' },
    { 'Группа': 'CHAMPIONS_LEAGUE', 'Тренер': 'Coach Victor', 'ФИО': 'Андрей Аршавин', 'Возраст': 12, 'Telefon': '+79998887733', 'Родитель': 'Сергей Аршавин' },

    // Group "Sparta Kids" (Beginners, 6-8 years)
    { 'Группа': 'SPARTA_KIDS', 'Тренер': 'Coach Olga', 'ФИО': 'Миша Медведев', 'Возраст': 7, 'Telefon': '+79998887744', 'Родитель': 'Дмитрий Медведев' },
    { 'Группа': 'SPARTA_KIDS', 'Тренер': 'Coach Olga', 'ФИО': 'Саша Белов', 'Возраст': 6, 'Telefon': '+79998887755', 'Родитель': 'Евгений Белов' }
];

// Create Workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(data);

// Adjust column widths (optional)
ws['!cols'] = [
    { wch: 20 }, // Group
    { wch: 15 }, // Coach
    { wch: 20 }, // Name
    { wch: 10 }, // Age
    { wch: 15 }, // Phone
    { wch: 15 }  // Parent
];

XLSX.utils.book_append_sheet(wb, ws, "Groups");

// Write to file - DIRECTLY TO DOWNLOADS
const outputPath = 'C:\\Users\\User\\Downloads\\test_groups_import.xlsx';

XLSX.writeFile(wb, outputPath);

console.log(`Test Excel file created at: ${outputPath}`);
