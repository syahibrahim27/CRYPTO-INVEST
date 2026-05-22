import { Router } from 'express';


const router = Router();


// Static news for demo; in produksi ambil dari feed atau DB
const NEWS = [
{ id: 1, title: 'Update Sistem 1.0', body: 'Perbaikan performa dan keamanan.', date: new Date() },
{ id: 2, title: 'Promo Mingguan', body: 'Deposit minimal 100k dapat bonus 2%.', date: new Date() }
];


router.get('/', (req, res) => res.json(NEWS));


export default router;