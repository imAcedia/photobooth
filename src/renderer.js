'use strict'

let isSandbox = true;
let snapAPI;
document.addEventListener("DOMContentLoaded", async () => {
    MicroModal.init();

    isSandbox = await window.getIsSandbox();
    snapAPI = isSandbox ? window.snapSandbox : window.snap;
});

// Ada bug kalo snap window di close, dia malah manggil onPending
let startLock = false;
const buttonStart = document.getElementById('button-start');
buttonStart.addEventListener('click', async () => {
    if (startLock) return;
    startLock = true;

    window.requestTransaction()
        .then((transaction) => {
            console.log(`${isSandbox ? 'Sandbox' : 'Prod'} Token: ${transaction.token}`);

            showPayPage();
            snapAPI.embed(transaction.token, {
                embedId: 'snap-container',
                // embedId: 'snap-container',
                onSuccess: (result) => {
                    console.log(`SNAP Payment Success!`);
                    console.log(result);
                    window.startDslrBooth().catch((e) => showErrorModal(e));
                    hidePayPage();
                },
                onPending: (result) => {
                    console.log(`SNAP still pending...`);
                    console.log(result);
                    hidePayPage();
                },
                onError: (result) => {
                    console.log(`SNAP Error!`);
                    console.log(result);
                    let err = getSnapErrorMessage(result);
                    if (err !== undefined) {
                        showErrorModal(err);
                    }

                    hidePayPage();
                },
                onClose: (result) => {
                    console.log(`SNAP closed.`);
                    console.log(result);
                    hidePayPage();
                },
            });
        })
        .catch((error) => {
            showErrorModal(error);
        })
        .finally(() => startLock = false);
});

///////////////////////////////////////////////////////////////////////////////////////////////////////

function showPayPage() {
    document.activeElement.blur();
    MicroModal.show('modal-pay', {
        onShow: (m) => {},
        onClose: (m) => { snapAPI.hide(); },
    });
}
function hidePayPage() {
    MicroModal.close('modal-pay');
    snapAPI.hide();

    document.activeElement.blur();
}

function showErrorModal(err) {
    console.log(err);
    document.getElementById('modal-error').checked = true;
    document.getElementById('modal-error-message').setHTMLUnsafe(err.toString());
}

function getSnapErrorMessage(result) {
    let messageList = {
        '400': 'Validation Error. You have sent bad request data like invalid transaction type, invalid payment card format, and so on.',
        '401': 'Access denied due to unauthorized transaction. Please check Client Key or Server Key.',
        '402': 'No access for this payment type.',
        '403': 'The requested resource is not capable of generating content in the format specified in the request headers.',
        '404': 'The requested resource/transaction is not found. Please check order_id or other details sent in the request.',
        '405': 'HTTP method is not allowed.',
        '406': 'Duplicate order ID. order_id has already been utilized previously.',
        '407': 'Expired transaction.',
        '408': 'Wrong data type.',
        '410': 'GoPay user is blocked',
        '411': 'token_id is missing, invalid, or timed out.',
        '412': 'Transaction status cannot be updated.',
        '413': 'The request cannot be processed due to syntax error in the request body.',
        '414': 'Refund request is rejected due to merchant insufficient funds.',
        '429': 'API rate limit exceeded. The global rate limit is applied to Create Pay Account API and Charge API',
    };

    return messageList[result['status_code']];
}