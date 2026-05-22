import mongoose from 'mongoose';


const productSchema = new mongoose.Schema({
name: String,
price: Number,
durationDays: Number,
roiPercent: Number, // keuntungan total selama durasi
imageUrl: String,
description: String
}, { timestamps: true });


export default mongoose.model('Product', productSchema);