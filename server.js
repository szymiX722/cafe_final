const bcrypt = require('bcrypt');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Połączenie z MongoDB
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log('Połączono z MongoDB'))
    .catch(err => console.error('Błąd połączenia:', err));

// AKTUALNY SCHEMAT (musi pasować do formularza!)
const zamowienieSchema = new mongoose.Schema({
    imieNazwisko: String,
    ciasto: String,
    ilosc: String,
    data_odbioru: String,
    kwota: String,
    uwagi: String,
    oplacone: { type: Boolean, default: false },
    data_zlozenia: { type: Date, default: Date.now }
});

const Zamowienie = mongoose.model('Zamowienie', zamowienieSchema);

// Endpoint do odbierania zamówień
app.post('/zamowienie', async (req, res) => {
    try {
        const noweZamowienie = new Zamowienie(req.body);
        await noweZamowienie.save();
        res.status(201).json(noweZamowienie);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Endpoint do listy (z sortowaniem po dacie odbioru)
app.get('/lista-zamowien', async (req, res) => {
    try {
        const zamowienia = await Zamowienie.find().sort({ data_odbioru: 1 });
        res.json(zamowienia);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Endpoint do zmiany statusu płatności (dla admina)
app.patch('/zamowienie/:id/status-platnosci', async (req, res) => {
    try {
        const { oplacone } = req.body;
        const update = await Zamowienie.findByIdAndUpdate(req.params.id, { oplacone }, { new: true });
        res.json(update);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Endpoint do usuwania
app.delete('/zamowienie/:id', async (req, res) => {
    try {
        await Zamowienie.findByIdAndDelete(req.params.id);
        res.status(200).send({ message: 'Usunięto' });
    } catch (err) {
        res.status(500).send(err);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serwer biega na porcie ${PORT}`));

// Schemat Użytkownika
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// Endpoint do logowania
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (user && await bcrypt.compare(password, user.password)) {
            res.json({ success: true, message: "Zalogowano" });
        } else {
            res.status(401).json({ success: false, message: "Błędne dane" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
});

// Endpoint do tworzenia użytkownika (użyjesz go raz, żeby stworzyć konto szefowej)
app.post('/create-admin-xyz123', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.send("Admin stworzony!");
});
