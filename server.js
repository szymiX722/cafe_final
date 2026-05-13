const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Połączenie z MongoDB (adres pobierzemy z Railway)
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('Połączono z MongoDB'))
  .catch(err => console.error('Błąd połączenia z bazą:', err));

// Definicja struktury zamówienia
const Zamowienie = mongoose.model('Zamowienie', {
    ciasto: String,
    ilosc: Number,
    data_odbioru: String,
    uwagi: String,
    kwota: String,
    status: { type: String, default: 'Nowe' },
    data_zlozenia: { type: Date, default: Date.now }
});

// Endpoint do odbierania zamówień
app.post('/zamowienie', async (req, res) => {
    try {
        const noweZamowienie = new Zamowienie(req.body);
        await noweZamowienie.save();
        res.status(201).send({ message: 'Zamówienie zapisane!' });
    } catch (error) {
        res.status(500).send({ error: 'Błąd zapisu' });
    }
});

// Endpoint do pobierania zamówień (dla admina)
app.get('/lista-zamowien', async (req, res) => {
    const dane = await Zamowienie.find().sort({ data_zlozenia: -1 });
    res.json(dane);
});

const PORT = process.env.PORT || 3000;

// Endpoint do usuwania zamówienia
app.delete('/zamowienie/:id', async (req, res) => {
    try {
        await Zamowienie.findByIdAndDelete(req.params.id);
        res.status(200).send({ message: 'Usunięto pomyślnie' });
    } catch (error) {
        res.status(500).send({ error: 'Błąd podczas usuwania z bazy' });
    }
});

app.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));
