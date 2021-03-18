const mongoose = require('mongoose')
const Store = mongoose.model('Store');
const multer = require('multer')
const jimp = require('jimp')
const uuid = require('uuid')

const multerOption = {
    //where will the file be stored when it's uploaded
    storage: multer.memoryStorage(), //into memory
    //what types of file are allowed
    fileFilter (req, file, next) {
        const isPhoto = file.mimetype.startsWith('image/');
        if (isPhoto)
            next(null, true)
        else
            next({ message: 'That file type isn\'t allowed!'}, false)
    }
}

exports.addStore = (req, res) => {
    res.render('editStore', { title: 'Add Store'})
}

exports.upload = multer(multerOption).single('photo');
exports.resize = async (req, res, next) => {
    //check if there no new file to resize
    if (!req.file) {
        next();
        return;
    }
    const fileExtension = req.file.mimetype.split('/')[1];
    req.body.photo = `${uuid.v4()}.${fileExtension}`; 
    //now we resize
    const photo = await jimp.read(req.file.buffer); //passing buffer
    await photo.resize(800, jimp.AUTO);
    await photo.write(`./public/uploads/${req.body.photo}`);
    //once we have written photo to out filesystem, keep going!
    next();
}

exports.createStore = async (req, res) => {
    req.body.author = req.user._id
    const store = await (new Store(req.body)).save();
    req.flash('success', `Successfully Create ${store.name}. Care to leave a review?`);
    res.redirect(`store/${store.slug}`)
}

exports.getStores = async (req, res) => {
    const stores = await Store.find()
    res.render('stores', { title: 'Stores', stores})
}

exports.getStoreBySlug = async (req, res, next) => {
    const store = await Store.findOne({slug: req.params.slug}).populate('author')
    if (!store) return next();
    res.render('store', {store, title: store.name})
}

const confirmOwner = (store, user) => {
    if (!store.author.equals(user._id)) {
        throw Error('You must own the store in order to edit!')
    }
}

exports.editStore = async (req, res) => {
    const store = await Store.findOne({ _id: req.params.id})
    confirmOwner(store, req.user);
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

exports.getStoresByTag = async (req, res) => {
    const tag = req.params.tag
    const tagQuery = tag || { $exists: true }
    const tagsPromise = Store.getTagsList();
    const storesPromise = Store.find({ tags: tagQuery })
    const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
    res.render('tag', {tags, stores, title: 'Tags', tag})
}

//API
exports.searchStores = async (req, res) => {
    const stores = await Store
    .find({
        $text: {
            $search: req.query.q
        }
    },{
        score: { $meta: 'textScore'}
    })
    .sort({
        score: { $meta: 'textScore'}
    })
    //limit to only 5 stores
    .limit(5)
    res.json(stores)
}