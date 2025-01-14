import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Form } from 'antd';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { URDecoder } from '@ngraveio/bc-ur';
import QRCodeReader from 'ui/component/QRCodeReader';
import { StrayPageWithButton } from 'ui/component';
import { useWallet } from 'ui/utils';
import { openInternalPageInTab } from 'ui/utils/webapi';
import './style.less';

import { HARDWARE_KEYRING_TYPES, WALLET_BRAND_CONTENT } from 'consts';
import QRCodeCheckerDetail from 'ui/views/QRCodeCheckerDetail';
import clsx from 'clsx';
import { useMedia } from 'react-use';

type Valueof<T> = T[keyof T];

const ImportQRCodeBase = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const [form] = Form.useForm();
  const decoder = useRef(new URDecoder());
  const [errorMessage, setErrorMessage] = useState('');
  const [scan, setScan] = useState(true);
  const isWide = useMedia('(min-width: 401px)');
  const { state } = useLocation<{
    brand: string;
  }>();

  const brandInfo: Valueof<typeof WALLET_BRAND_CONTENT> =
    WALLET_BRAND_CONTENT[state.brand] || WALLET_BRAND_CONTENT.Keystone;

  const showErrorChecker = useMemo(() => {
    return errorMessage !== '';
  }, [errorMessage]);

  const handleScanQRCodeSuccess = async (data) => {
    try {
      decoder.current.receivePart(data);
      if (decoder.current.isComplete()) {
        const result = decoder.current.resultUR();
        let stashKeyringId;
        if (result.type === 'crypto-hdkey') {
          stashKeyringId = await wallet.submitQRHardwareCryptoHDKey(
            result.cbor.toString('hex')
          );
        } else if (result.type === 'crypto-account') {
          stashKeyringId = await wallet.submitQRHardwareCryptoAccount(
            result.cbor.toString('hex')
          );
        } else {
          setErrorMessage(
            t(
              'Invalid QR code. Please scan the sync QR code of the hardware wallet.'
            )
          );
          return;
        }
        history.push({
          pathname: '/popup/import/select-address',
          state: {
            keyring: HARDWARE_KEYRING_TYPES.Keystone.type,
            keyringId: stashKeyringId,
            brand: state.brand,
          },
        });
      }
    } catch (e) {
      setScan(false);
      setErrorMessage(
        t(
          'Invalid QR code. Please scan the sync QR code of the hardware wallet.'
        )
      );
    }
  };

  const handleScanQRCodeError = async () => {
    await wallet.setPageStateCache({
      path: history.location.pathname,
      params: {},
      states: form.getFieldsValue(),
    });
    openInternalPageInTab('request-permission?type=camera');
  };

  const handleClickBack = () => {
    if (history.length > 1) {
      history.goBack();
    } else {
      history.replace('/');
    }
  };

  useEffect(() => {
    return () => {
      wallet.clearPageStateCache();
    };
  }, []);

  const handleScan = () => {
    setErrorMessage('');
    setScan(true);
  };
  return (
    <StrayPageWithButton
      custom={isWide}
      form={form}
      hasBack
      hasDivider
      noPadding
      className={clsx('import-qrcode', isWide && 'rabby-stray-page')}
      onBackClick={handleClickBack}
    >
      <header className="create-new-header create-password-header h-[264px] res">
        <div className="rabby-container">
          <img
            className="rabby-logo"
            src="/images/logo-gray.png"
            alt="rabby logo"
          />
          <img
            className="unlock-logo w-[80px] h-[75px] mb-20 mx-auto"
            src={brandInfo.image}
          />
          <p className="text-24 mb-4 mt-0 text-white text-center font-bold">
            {brandInfo.name}
          </p>
          <p className="text-14 mb-0 mt-4 text-white opacity-80 text-center">
            {`Scan the QR code on the ${brandInfo.name} hardware wallet`}
          </p>
          <img src="/images/watch-mask.png" className="mask" />
        </div>
      </header>
      <div className="flex justify-center qrcode-scanner">
        {scan && (
          <QRCodeReader
            width={176}
            height={176}
            onSuccess={handleScanQRCodeSuccess}
            onError={handleScanQRCodeError}
          />
        )}
        {showErrorChecker && (
          <QRCodeCheckerDetail
            visible={showErrorChecker}
            onCancel={handleClickBack}
            data={errorMessage}
            onOk={handleScan}
            okText={t('Try Again')}
            cancelText={t('Cancel')}
          />
        )}
      </div>
    </StrayPageWithButton>
  );
};

export default ImportQRCodeBase;
