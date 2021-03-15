const mongoose = require('mongoose')
const Store = mongoose.model('Store');

exports.addStore = (req, res) => {
    res.render('editStore', { title: 'Add Store'})
}

exports.createStore = async (req, res) => {
    const store = await (new Store(req.body)).save();
    req.flash('success', `Successfully Create ${store.name}. Care to leave a review?`);
    res.redirect(`store/${store.slug}`)
}

exports.getStores = async (req, res) => {
    const stores = await Store.find()
    res.render('stores', { title: 'Stores', stores})
}

// exports.getStore = asycn (req, res) => {
//     const store = await Store.findOne({_id: req.params.id})
    
// }

exports.editStore = async (req, res) => {
    const store = await Store.findOne({ _id: req.params.id})
    res.render('editStore', { title: `Edit ${store.name}`, store })
}

exports.updateStore = async (req, res) => {
    req.body.location.type = 'Point';
    const store = await Store.findOneAndUpdate({ _id: req.params.id}, req.body, {
        new: true, //return new store instead of old one
        runValidators: true //validates input defined in model
    }).exec(); //force execution
    req.flash('success', `Successfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store`)
    res.redirect(`/stores/${store._id}/edit`);
}