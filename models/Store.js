const mongoose = require('mongoose')
mongoose.Promise = global.Promise;

const slug = require('slugs')

const StoreSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        required: 'Please enter a store name!',
    },
    slug: String,
    description: {
        type: String,
        trim: true
    },
    tags: [String],
    created: {
        type: Date,
        default: Date.now
    },
    location: {
        type: {
            type: String,
            default: 'Point'
        },
        coordinates: [{
            type: Number,
            required: 'You must supply coordinates'
        }],
        address: {
            type: String,
            required: 'You must supply an address'
        }
    },
    photo: String,
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: 'You must supply an author'
    }
}, {
   toJSON: { virtuals: true},
   toObject: { virtuals: true }
});

//Define index
StoreSchema.index({
    name: 'text',
    description: 'text',
});

StoreSchema.index({ location: '2dsphere'});

StoreSchema.pre('save', async function(next) {
    if (!this.isModified('name')) {
        next(); //skip it
        return; //stop this function from running
    }
    this.slug = slug(this.name);
    //find other stores that have a similar slug (oysters, oysters-2, oysters-3 ...)
    const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
    const storesWithSlug = await this.constructor.find({slug: slugRegEx});

    if (storesWithSlug) {
        this.slug = `${this.slug}-${storesWithSlug.length + 1}`
    }
    next();
    //TODO make more resilient so slugs are unique
})

StoreSchema.statics.getTagsList = function() {
    return this.aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1} } },
        { $sort: { _id: 1, count: -1} }
    ]);
}

StoreSchema.statics.getTopStores = function() {
    return this.aggregate([
        //lookup stores and populate their reviews
        { 
            $lookup: {
                from: 'reviews', 
                localField: '_id', 
                foreignField: 'store',
                as: 'reviews'
            }
        },
        //filter for only items that have 2 or more reviews
        { $match: { 'reviews.1': { $exists: true}}},
        //add the average reviews field
        { $project: {
            photo: '$$ROOT.photo',
            name: '$$ROOT.name',
            reviews: '$$ROOT.reviews',
            slug: '$$ROOT.slug',
            averageRating: { $avg: '$reviews.rating' }
        }},
        //sort it by out new heighest reviews first
        { $sort: { averageRating: -1 }},
        //limit to at most 10
        { $limit: 10 }
    ])
}

//find reviews where the store _id property === reviews store property
StoreSchema.virtual('reviews', {
    ref: 'Review', //what model to link?
    localField: '_id', //which field on the store?
    foreignField: 'store' // which field on the review?
})

function autopopulate(next) {
    this.populate('reviews');
    next();
}

StoreSchema.pre('find', autopopulate);
StoreSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', StoreSchema)