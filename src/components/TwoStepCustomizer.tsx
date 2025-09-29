import { useState } from 'react'
import CustomizerStep1 from './CustomizerStep1'
import CustomizerStep2 from './CustomizerStep2'
import { usePricingStore } from '@/lib/store'
import toast from 'react-hot-toast'

const TwoStepCustomizer = () => {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [designData, setDesignData] = useState<{
    selectedProduct: string
  }>({
    selectedProduct: ''
  })

  const { prints } = usePricingStore()

  const handleStep1Next = () => {
    // Get current state from pricing store and local state
    const product = designData.selectedProduct
    
    // Validate required fields - let Step1 component handle its own validation
    // The button is already disabled based on isDesignComplete logic

    // Additional guard: require artwork for each active print placement
    const allActiveHaveArtwork = prints
      .filter(p => p.active !== false)
      .every(p => Array.isArray(p.artworkFiles) && p.artworkFiles.length > 0 && !!p.artworkFiles[0])

    if (!allActiveHaveArtwork) {
      toast.error('Upload artwork to each print placement to continue')
      return
    }

    setCurrentStep(2)
  }

  const handleStep2Back = () => {
    setCurrentStep(1)
  }

  // Pass design data between steps
  const updateDesignData = (data: Partial<typeof designData>) => {
    setDesignData(prev => ({ ...prev, ...data }))
  }

  return (
    <div className="min-h-screen bg-background">
      {currentStep === 1 ? (
        <CustomizerStep1 
          onNext={handleStep1Next}
          onDataChange={updateDesignData}
          designData={designData}
        />
      ) : (
        <CustomizerStep2 
          onBack={handleStep2Back}
          selectedProduct={designData.selectedProduct}
        />
      )}
    </div>
  )
}

export default TwoStepCustomizer
