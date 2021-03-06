const nodemailer = require('nodemailer')
const promisify = require('es6-promisify')
const pug = require('pug')
const juice = require('juice')
const htmlToText = require('html-to-text')

const transport = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

transport.sendMail({
    from: 'Wes Bos <wesbos@gmail.com>',
    to: 'kbarinova11@gmail.com',
    subject: 'testing',
    html: 'Hey I <strong>love</strong> you',
    text: 'Hey I love you'
});

const generateHTML = (filename, options = {}) => {
    const html = pug.renderFile(`${__dirname}/../views/email/${filename}.pug`, options)
    const inlined = juice(html);
    return inlined;
}

exports.send = async (options) => {
    const html = generateHTML(options.filename, options);
    const text = htmlToText.fromString(html);

    const mailOptions = {
        from: 'Dang <noreply@dang.com>',
        to: options.user.email,
        html,
        subject: options.subject,
        text
    };
    const sendMail = promisify(transport.sendMail, transport)
    return sendMail(mailOptions);
}